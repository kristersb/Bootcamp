const path = require('path')
const Database = require('better-sqlite3')

// DATABASE_PATH lets tests run against a throwaway file instead of the real data.
const db = new Database(process.env.DATABASE_PATH || path.join(__dirname, 'data.sqlite'))

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    preconditions TEXT NOT NULL DEFAULT '[]',
    steps TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('Critical', 'Major', 'Minor', 'Trivial')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'passed', 'failed', 'skipped')) DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

// Counts saves of a test case so an editor holding an old copy can be told it is out of date.
if (!db.prepare('PRAGMA table_info(test_cases)').all().some((column) => column.name === 'version')) {
  db.exec('ALTER TABLE test_cases ADD COLUMN version INTEGER NOT NULL DEFAULT 1')
}

const SEED_TEST_CASES = [
  {
    title: '[Login] Successful login with valid credentials',
    preconditions: ['User has an existing account with a known valid email and password.'],
    steps: ['Navigate to the login page', 'Enter a valid email and password', 'Click the Login button'],
    expected_result: 'The user is authenticated and redirected to the dashboard.',
    severity: 'Major',
    status: 'passed',
  },
  {
    title: '[Login] Login blocked after 5 failed attempts',
    preconditions: ['User account exists and is not already locked.'],
    steps: [
      'Navigate to the login page',
      'Enter the correct email with an incorrect password 5 times in a row',
      'Attempt to log in a 6th time with the correct password',
    ],
    expected_result: 'The account is locked and an error message explains the account is temporarily locked.',
    severity: 'Critical',
    status: 'draft',
  },
  {
    title: '[Checkout] Order total updates when a coupon code is applied',
    preconditions: ['Cart has at least one item.', 'A valid, unused coupon code exists.'],
    steps: ['Add an item to the cart', 'Go to checkout', 'Enter a valid coupon code', 'Click Apply'],
    expected_result: 'The order total is reduced by the coupon amount and the discount line is shown.',
    severity: 'Major',
    status: 'ready',
  },
  {
    title: '[Profile] Avatar upload accepts JPEG and PNG only',
    preconditions: ['User is logged in.', 'User is on their profile settings page.'],
    steps: ['Open the avatar upload dialog', 'Select a .gif file', 'Click Upload'],
    expected_result: 'The upload is rejected with a message stating only JPEG and PNG files are supported.',
    severity: 'Minor',
    status: 'failed',
  },
  {
    title: '[Navigation] Footer links open in the correct tab',
    preconditions: ['User is on any page of the site.'],
    steps: ['Scroll to the footer', 'Click the "Terms of Service" link'],
    expected_result: 'The Terms of Service page opens in a new browser tab.',
    severity: 'Trivial',
    status: 'skipped',
  },
]

db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS test_suites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    feature TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'in-progress', 'passed', 'failed')) DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS test_suite_cases (
    suite_id INTEGER NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    PRIMARY KEY (suite_id, test_case_id)
  );

  CREATE INDEX IF NOT EXISTS idx_test_suite_cases_order ON test_suite_cases (suite_id, sort_order);
`)

const insertTestCase = db.prepare(`
  INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status)
  VALUES (@title, @preconditions, @steps, @expected_result, @severity, @status)
`)

function seedTestCase(row) {
  return insertTestCase.run({
    ...row,
    preconditions: JSON.stringify(row.preconditions),
    steps: JSON.stringify(row.steps),
  }).lastInsertRowid
}

const { count } = db.prepare('SELECT COUNT(*) AS count FROM test_cases').get()

if (count === 0) {
  db.transaction((rows) => rows.forEach(seedTestCase))(SEED_TEST_CASES)
}

const EXTRA_SEED_TEST_CASES = [
  {
    title: '[Login] Password reset email is sent for a registered address',
    preconditions: ['User has an existing account.', 'User is on the login page.'],
    steps: ['Click "Forgot password"', 'Enter the registered email address', 'Click Send reset link'],
    expected_result: 'A confirmation message is shown and a reset email arrives within 1 minute.',
    severity: 'Major',
    status: 'ready',
  },
  {
    title: '[Checkout] Guest checkout completes without an account',
    preconditions: ['Cart has at least one item.', 'User is not logged in.'],
    steps: [
      'Go to checkout',
      'Select "Continue as guest"',
      'Enter shipping and payment details',
      'Click Place order',
    ],
    expected_result: 'The order is placed and a confirmation page is shown.',
    severity: 'Major',
    status: 'draft',
  },
  {
    title: '[Checkout] Empty cart cannot proceed to payment',
    preconditions: ['Cart is empty.'],
    steps: ['Open the cart page', 'Click Checkout'],
    expected_result: 'The Checkout action is blocked and a message states the cart is empty.',
    severity: 'Minor',
    status: 'draft',
  },
]

const SEED_TEST_SUITES = [
  {
    name: 'Login regression',
    feature: 'login',
    status: 'ready',
    caseTitles: [
      '[Login] Successful login with valid credentials',
      '[Login] Login blocked after 5 failed attempts',
      '[Login] Password reset email is sent for a registered address',
    ],
  },
  {
    name: 'Checkout smoke',
    feature: 'checkout',
    status: 'draft',
    caseTitles: [
      '[Checkout] Guest checkout completes without an account',
      '[Checkout] Order total updates when a coupon code is applied',
      '[Checkout] Empty cart cannot proceed to payment',
    ],
  },
]

const { suiteCount } = db.prepare('SELECT COUNT(*) AS suiteCount FROM test_suites').get()

if (suiteCount === 0) {
  const seedSuites = db.transaction(() => {
    const definitions = [...SEED_TEST_CASES, ...EXTRA_SEED_TEST_CASES]
    const findCaseByTitle = db.prepare('SELECT id FROM test_cases WHERE title = ?')
    const insertSuite = db.prepare('INSERT INTO test_suites (name, feature, status) VALUES (@name, @feature, @status)')
    const linkCase = db.prepare('INSERT INTO test_suite_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)')

    function getCaseId(title) {
      const existing = findCaseByTitle.get(title)
      if (existing) return existing.id
      return seedTestCase(definitions.find((definition) => definition.title === title))
    }

    for (const suite of SEED_TEST_SUITES) {
      const suiteId = insertSuite.run({ name: suite.name, feature: suite.feature, status: suite.status }).lastInsertRowid
      suite.caseTitles.forEach((title, index) => linkCase.run(suiteId, getCaseId(title), index + 1))
    }
  })
  seedSuites()
}

db.exec(`
  CREATE TABLE IF NOT EXISTS bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    severity TEXT NOT NULL CHECK (severity IN ('Critical', 'Major', 'Minor', 'Trivial')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    status TEXT NOT NULL CHECK (status IN ('open', 'in-progress', 'resolved', 'closed', 'reopened')) DEFAULT 'open',
    steps_to_reproduce TEXT NOT NULL,
    expected TEXT NOT NULL,
    actual TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bug_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'status_changed', 'comment')),
    old_value TEXT,
    new_value TEXT,
    message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bug_activity_bug ON bug_activity (bug_id, id);
  CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs (status);

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

// Same format as datetime('now'): UTC, "YYYY-MM-DD HH:MM:SS".
function hoursAgo(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')
}

const SEED_BUGS = [
  {
    title: 'Order total ignores the coupon after the cart quantity changes',
    description:
      "After a coupon is applied at checkout, changing an item's quantity recalculates the subtotal but drops the discount line.",
    severity: 'Major',
    priority: 'high',
    status: 'in-progress',
    steps: [
      'Add one item to the cart',
      'Go to checkout and apply a valid coupon code',
      'Return to the cart and change the item quantity to 2',
      'Go back to checkout',
    ],
    expected: 'The discount is still applied and the order total reflects it.',
    actual: 'The discount line disappears and the full price is charged.',
    environment: 'Chrome 126 on macOS 14, staging',
    createdHoursAgo: 72,
    activity: [
      { action: 'status_changed', old: 'open', new: 'in-progress', message: 'Picked up by the checkout team.', hoursAgo: 48 },
      { action: 'comment', message: 'Reproduced on staging. The coupon is cleared when the cart is re-priced.', hoursAgo: 24 },
    ],
  },
  {
    title: 'Avatar upload accepts .gif files',
    description: 'The profile page says only JPEG and PNG files are supported, but a .gif file is accepted and saved.',
    severity: 'Minor',
    priority: 'medium',
    status: 'open',
    steps: [
      'Log in and open profile settings',
      'Open the avatar upload dialog',
      'Select a .gif file',
      'Click Upload',
    ],
    expected: 'The upload is rejected with a message that only JPEG and PNG files are supported.',
    actual: 'The .gif file is uploaded and shown as the avatar.',
    environment: 'Firefox 127 on Windows 11, production',
    createdHoursAgo: 4,
    activity: [],
  },
  {
    title: 'Login page is blank on Safari 16',
    description:
      'Users on Safari 16 see a white page after the login screen loads. The console shows a syntax error in the main bundle.',
    severity: 'Critical',
    priority: 'high',
    status: 'resolved',
    steps: ['Open the login page in Safari 16', 'Wait for the page to finish loading'],
    expected: 'The login form is shown.',
    actual: 'The page stays blank and no form is rendered.',
    environment: 'Safari 16.4 on macOS 13, production',
    createdHoursAgo: 144,
    activity: [
      { action: 'status_changed', old: 'open', new: 'in-progress', message: 'Assigned to the web platform team.', hoursAgo: 142 },
      { action: 'comment', message: 'Cause found: the build output used syntax that Safari 16 does not support.', hoursAgo: 120 },
      { action: 'status_changed', old: 'in-progress', new: 'resolved', message: 'Fixed in release 2.4.1 by lowering the build target.', hoursAgo: 96 },
    ],
  },
]

// Seeds the example bugs exactly once. The marker row stops them coming back if you delete them.
if (!db.prepare("SELECT 1 FROM app_meta WHERE key = 'bugs_seeded'").get()) {
  db.transaction(() => {
    const insertBug = db.prepare(`
      INSERT INTO bugs (title, description, severity, priority, status, steps_to_reproduce, expected, actual, environment, created_at, updated_at)
      VALUES (@title, @description, @severity, @priority, @status, @steps, @expected, @actual, @environment, @createdAt, @updatedAt)
    `)
    const insertActivity = db.prepare(`
      INSERT INTO bug_activity (bug_id, action, old_value, new_value, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    for (const bug of SEED_BUGS) {
      const lastChangeHoursAgo = Math.min(
        bug.createdHoursAgo,
        ...bug.activity.filter((entry) => entry.action === 'status_changed').map((entry) => entry.hoursAgo)
      )
      const bugId = insertBug.run({
        ...bug,
        steps: JSON.stringify(bug.steps),
        createdAt: hoursAgo(bug.createdHoursAgo),
        updatedAt: hoursAgo(lastChangeHoursAgo),
      }).lastInsertRowid

      insertActivity.run(bugId, 'created', null, 'open', null, hoursAgo(bug.createdHoursAgo))
      for (const entry of bug.activity) {
        insertActivity.run(bugId, entry.action, entry.old ?? null, entry.new ?? null, entry.message, hoursAgo(entry.hoursAgo))
      }
    }

    db.prepare("INSERT INTO app_meta (key, value) VALUES ('bugs_seeded', '1')").run()
  })()
}

// A run is a historical record: it keeps its own copy of the suite name and each case title, so renaming or
// deleting the suite or a test case later does not rewrite what was run. "result" is NULL until a case is recorded.
db.exec(`
  CREATE TABLE IF NOT EXISTS test_runs_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id INTEGER REFERENCES test_suites(id) ON DELETE SET NULL,
    suite_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('in-progress', 'passed', 'failed')) DEFAULT 'in-progress',
    pass_count INTEGER NOT NULL DEFAULT 0,
    fail_count INTEGER NOT NULL DEFAULT 0,
    skip_count INTEGER NOT NULL DEFAULT 0,
    start_time TEXT NOT NULL DEFAULT (datetime('now')),
    end_time TEXT,
    locked_at TEXT,
    created_by TEXT NOT NULL DEFAULT 'anonymous'
  );

  CREATE TABLE IF NOT EXISTS test_run_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES test_runs_v2(id) ON DELETE CASCADE,
    test_case_id INTEGER REFERENCES test_cases(id) ON DELETE SET NULL,
    case_title TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    result TEXT CHECK (result IN ('passed', 'failed', 'skipped')),
    duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
    notes TEXT NOT NULL DEFAULT '',
    failed_at TEXT,
    alert_sent INTEGER NOT NULL DEFAULT 0 CHECK (alert_sent IN (0, 1)),
    alert_sent_at TEXT,
    alert_error TEXT,
    recorded_at TEXT,
    UNIQUE (run_id, sort_order)
  );

  CREATE INDEX IF NOT EXISTS idx_test_run_results_run ON test_run_results (run_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_test_runs_start ON test_runs_v2 (start_time);
`)

// A run is only finished when someone completes it, which sets locked_at and freezes the results.
// Runs from before this existed finished by themselves, so they are put back to "in-progress" with every outcome
// still recorded. They are not locked on anyone's behalf: the person completes them with the usual confirmation.
if (!db.prepare('PRAGMA table_info(test_runs_v2)').all().some((column) => column.name === 'locked_at')) {
  db.transaction(() => {
    db.exec('ALTER TABLE test_runs_v2 ADD COLUMN locked_at TEXT')
    db.exec("UPDATE test_runs_v2 SET status = 'in-progress', end_time = NULL WHERE status != 'in-progress'")
  })()
}

// Seeds one demo run exactly once, from the example "Login regression" suite. Every case already has an outcome,
// so it is ready to be completed. Nothing is sent to Discord when seeding: the failed row records that no alert went out.
if (!db.prepare("SELECT 1 FROM app_meta WHERE key = 'test_runs_seeded'").get()) {
  db.transaction(() => {
    const suite = db.prepare("SELECT id, name FROM test_suites WHERE name = 'Login regression' ORDER BY id LIMIT 1").get()
    const cases = suite
      ? db
          .prepare(
            `SELECT t.id, t.title, c.sort_order
             FROM test_suite_cases c JOIN test_cases t ON t.id = c.test_case_id
             WHERE c.suite_id = ? ORDER BY c.sort_order ASC`
          )
          .all(suite.id)
      : []

    if (cases.length >= 3) {
      const demo = [
        { result: 'passed', duration: 1800, notes: 'Logged in and landed on the dashboard.', minutesAfterStart: 6 },
        {
          result: 'failed',
          duration: 94500,
          notes: 'The account was not locked after the 5th wrong password. The 6th attempt with the correct password logged in.',
          minutesAfterStart: 17,
        },
        { result: 'skipped', duration: null, notes: 'The email service is down in the test environment.', minutesAfterStart: 18 },
      ]
      const start = Date.now() - 3 * 3600 * 1000
      const stamp = (minutes) => new Date(start + minutes * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')

      const runId = db
        .prepare(
          `INSERT INTO test_runs_v2 (suite_id, suite_name, status, pass_count, fail_count, skip_count, start_time, created_by)
           VALUES (?, ?, 'in-progress', 1, 1, 1, ?, 'demo seed')`
        )
        .run(suite.id, suite.name, stamp(0)).lastInsertRowid

      const insertResult = db.prepare(
        `INSERT INTO test_run_results (run_id, test_case_id, case_title, sort_order, result, duration_ms, notes, failed_at, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      cases.slice(0, 3).forEach((testCase, index) => {
        const entry = demo[index]
        const when = stamp(entry.minutesAfterStart)
        insertResult.run(
          runId,
          testCase.id,
          testCase.title,
          index + 1,
          entry.result,
          entry.duration,
          entry.notes,
          entry.result === 'failed' ? when : null,
          when
        )
      })
    }

    db.prepare("INSERT INTO app_meta (key, value) VALUES ('test_runs_seeded', '1')").run()
  })()
}

// A report is a frozen snapshot of a run: its counts and per-case results are copied in at generation time, so a
// later change to the run (or its deletion) never alters a report that was already generated from it.
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES test_runs_v2(id) ON DELETE CASCADE,
    suite_name TEXT NOT NULL,
    run_date TEXT NOT NULL,
    total_count INTEGER NOT NULL,
    passed_count INTEGER NOT NULL,
    failed_count INTEGER NOT NULL,
    skipped_count INTEGER NOT NULL,
    results TEXT NOT NULL,
    created_by TEXT,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_reports_generated ON reports (generated_at);
`)

// Carries over who ran the test, for the export's header. Existing reports (created before this column existed)
// are backfilled from their run; a run that was since deleted leaves it NULL, which the export shows as "—".
if (!db.prepare('PRAGMA table_info(reports)').all().some((column) => column.name === 'created_by')) {
  db.transaction(() => {
    db.exec('ALTER TABLE reports ADD COLUMN created_by TEXT')
    db.exec(`
      UPDATE reports
      SET created_by = (SELECT created_by FROM test_runs_v2 WHERE test_runs_v2.id = reports.run_id)
      WHERE created_by IS NULL
    `)
  })()
}

// Seeds one demo report from the demo run above, exactly once.
if (!db.prepare("SELECT 1 FROM app_meta WHERE key = 'reports_seeded'").get()) {
  db.transaction(() => {
    const run = db.prepare("SELECT * FROM test_runs_v2 WHERE created_by = 'demo seed' ORDER BY id DESC LIMIT 1").get()

    if (run) {
      const results = db
        .prepare('SELECT case_title, result, duration_ms, notes FROM test_run_results WHERE run_id = ? ORDER BY sort_order ASC')
        .all(run.id)

      db.prepare(
        `INSERT INTO reports (run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, results, created_by)
         VALUES (@runId, @suiteName, @runDate, @total, @passed, @failed, @skipped, @results, @createdBy)`
      ).run({
        runId: run.id,
        suiteName: run.suite_name,
        runDate: run.start_time,
        total: results.length,
        passed: run.pass_count,
        failed: run.fail_count,
        skipped: run.skip_count,
        results: JSON.stringify(results),
        createdBy: run.created_by,
      })
    }

    db.prepare("INSERT INTO app_meta (key, value) VALUES ('reports_seeded', '1')").run()
  })()
}

// One row per user. Only one user exists today, so it is pinned to id 1 rather than keyed by an account table.
// timezone has no default: NULL means "not set yet", and the client falls back to the browser's timezone for
// display until the user explicitly saves one.
db.exec(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    theme TEXT NOT NULL CHECK (theme IN ('light', 'dark', 'system')) DEFAULT 'system',
    default_severity_for_new_bugs TEXT NOT NULL CHECK (default_severity_for_new_bugs IN ('Critical', 'Major', 'Minor', 'Trivial')) DEFAULT 'Minor',
    default_page_size INTEGER NOT NULL CHECK (default_page_size IN (10, 20, 50, 100)) DEFAULT 20,
    timezone TEXT,
    auto_generate_report_after_run INTEGER NOT NULL CHECK (auto_generate_report_after_run IN (0, 1)) DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

db.prepare('INSERT OR IGNORE INTO user_preferences (id) VALUES (1)').run()

module.exports = db
