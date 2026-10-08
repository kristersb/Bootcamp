const express = require('express')
const db = require('../db')

const router = express.Router()

function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null })
}

function sendError(res, status, error) {
  return res.status(status).json({ success: false, data: null, error })
}

// Plain digits only. Number() would also accept forms like "1e0", "0x1", "1.0" and " 1" as ids.
function parseId(value) {
  return /^[1-9]\d{0,14}$/.test(String(value)) ? Number(value) : null
}

function parseReport(row) {
  return { ...row, results: JSON.parse(row.results) }
}

function findReport(id) {
  const row = id ? db.prepare('SELECT * FROM reports WHERE id = ?').get(id) : undefined
  return row ? parseReport(row) : undefined
}

function handleListReports(req, res) {
  const items = db
    .prepare('SELECT id, run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, generated_at FROM reports ORDER BY generated_at DESC, id DESC')
    .all()
  return sendSuccess(res, items)
}

// Snapshots the run's results as they stand right now. Nothing stops this being called again for the same run_id:
// each call is a separate report, because a report is a point-in-time record, not a run's single source of truth.
function handleCreateReport(req, res) {
  const runId = parseId(req.body.run_id)
  if (!runId) return sendError(res, 400, 'run_id must be a positive whole number')

  const run = db.prepare('SELECT * FROM test_runs_v2 WHERE id = ?').get(runId)
  if (!run) return sendError(res, 404, 'Test run not found')

  const results = db
    .prepare('SELECT case_title, result, duration_ms, notes FROM test_run_results WHERE run_id = ? ORDER BY sort_order ASC, id ASC')
    .all(runId)

  const id = db
    .prepare(
      `INSERT INTO reports (run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, results, created_by)
       VALUES (@runId, @suiteName, @runDate, @total, @passed, @failed, @skipped, @results, @createdBy)`
    )
    .run({
      runId,
      suiteName: run.suite_name,
      runDate: run.start_time,
      total: results.length,
      passed: run.pass_count,
      failed: run.fail_count,
      skipped: run.skip_count,
      results: JSON.stringify(results),
      createdBy: run.created_by,
    }).lastInsertRowid

  return sendSuccess(res, findReport(id), 201)
}

function handleGetReport(req, res) {
  const report = findReport(parseId(req.params.id))
  if (!report) return sendError(res, 404, 'Report not found')
  return sendSuccess(res, report)
}

const PRODUCT_NAME = 'QA Workbench'

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// Same display rule as the client's formatDuration: stored values are UTC "YYYY-MM-DD HH:MM:SS", shown in the
// server's local time since this runs for whoever downloads the file, not for a specific browser locale.
function formatTimestamp(value) {
  return new Date(value.replace(' ', 'T') + 'Z').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatDuration(ms) {
  if (ms == null) return '—'
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 1) return ms === 0 ? '0s' : '<1s'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`
  return `${seconds}s`
}

// Tiny inline icon set, drawn as plain SVG paths so a status badge still has a glyph with no icon font or CDN to load.
const STATUS_ICONS = {
  passed: '<path d="M6.2 11.4 3.3 8.5l-1.1 1.1L6.2 13.6 14 5.8l-1.1-1.1z"/>',
  failed: '<path d="M4.6 3.5 3.5 4.6 6.9 8l-3.4 3.4 1.1 1.1L8 9.1l3.4 3.4 1.1-1.1L9.1 8l3.4-3.4-1.1-1.1L8 6.9z"/>',
  skipped: '<path d="M3.5 7h9v2h-9z"/>',
  pending: '<path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2m0 1.5A4.5 4.5 0 1 1 8 12.5 4.5 4.5 0 0 1 8 3.5"/>',
}

function statusIcon(outcome) {
  return `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${STATUS_ICONS[outcome]}</svg>`
}

// Self-contained on purpose: every style is inline in the <style> tag below, the only "icons" are inline SVG paths,
// and nothing is loaded from a CDN or external font — the downloaded file still renders (and prints) correctly
// offline. Failed rows get a tinted background instead of an accordion: there's no stack trace to collapse here,
// just a notes field, so a quiet highlight reads better on screen and on paper than an interactive widget would.
function renderReportHtml(report) {
  const rows = report.results
    .map((result, index) => {
      const outcome = result.result || 'pending'
      const label = result.result ? result.result.toUpperCase() : 'PENDING'
      return `
      <tr class="${outcome === 'failed' ? 'row-failed' : ''}">
        <td class="col-num">${index + 1}</td>
        <td>
          <span class="case-title">${escapeHtml(result.case_title)}</span>
          ${result.notes ? `<p class="case-notes">${escapeHtml(result.notes)}</p>` : ''}
        </td>
        <td><span class="badge badge-${outcome}">${statusIcon(outcome)}${label}</span></td>
        <td class="col-duration">${formatDuration(result.duration_ms)}</td>
      </tr>`
    })
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(report.suite_name)} - Test Report #${report.id}</title>
<style>
  :root {
    color-scheme: light;
    --color-pass: #1a7f4e;
    --color-pass-bg: #e3f7ec;
    --color-fail: #b3261e;
    --color-fail-bg: #fdecea;
    --color-skip: #8a6400;
    --color-skip-bg: #fbf0d1;
    --color-pending: #555;
    --color-pending-bg: #ececec;
    --color-border: #e2e2e5;
    --color-muted: #666;
  }
  * { box-sizing: border-box; }
  svg { width: 0.7rem; height: 0.7rem; fill: currentColor; flex: none; }
  body {
    margin: 0;
    padding: 2.5rem 1.5rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    background: #ebebee;
  }
  .sheet {
    max-width: 920px;
    margin: 0 auto;
    padding: 2.5rem;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }
  .print-button {
    margin-bottom: 1.5rem;
    padding: 0.55rem 1.1rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: #f5f5f5;
    font: inherit;
    cursor: pointer;
  }
  .print-button:hover { background: #ebebeb; }
  .eyebrow { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-muted); }
  h1 { margin: 0.2rem 0 1.25rem; font-size: 1.6rem; }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.75rem 1.5rem;
    margin: 0 0 1.75rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .meta-grid dt { margin: 0; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-muted); }
  .meta-grid dd { margin: 0.2rem 0 0; font-size: 0.92rem; font-weight: 600; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.85rem; margin-bottom: 2rem; }
  .stat { padding: 1rem 0.5rem; border-radius: 10px; text-align: center; border: 1px solid var(--color-border); }
  .stat .value { display: block; font-size: 1.9rem; font-weight: 800; line-height: 1.1; }
  .stat .label { display: block; margin-top: 0.3rem; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .stat-total { background: #f3f3f5; }
  .stat-passed { background: var(--color-pass-bg); }
  .stat-passed .value, .stat-passed .label { color: var(--color-pass); }
  .stat-failed { background: var(--color-fail-bg); }
  .stat-failed .value, .stat-failed .label { color: var(--color-fail); }
  .stat-skipped { background: var(--color-skip-bg); }
  .stat-skipped .value, .stat-skipped .label { color: var(--color-skip); }
  table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
  thead th {
    padding: 0.6rem 0.7rem;
    text-align: left;
    background: #f3f3f5;
    border-bottom: 2px solid var(--color-border);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }
  tbody td { padding: 0.65rem 0.7rem; border-bottom: 1px solid var(--color-border); vertical-align: top; }
  tbody tr.row-failed { background: var(--color-fail-bg); }
  .col-num { width: 2.5rem; color: var(--color-muted); }
  .col-duration { width: 6rem; white-space: nowrap; }
  .case-title { font-weight: 600; }
  .case-notes { margin: 0.35rem 0 0; font-size: 0.82rem; color: #444; }
  .row-failed .case-notes { color: var(--color-fail); }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }
  .badge-passed { background: var(--color-pass-bg); color: var(--color-pass); }
  .badge-failed { background: var(--color-fail-bg); color: var(--color-fail); }
  .badge-skipped { background: var(--color-skip-bg); color: var(--color-skip); }
  .badge-pending { background: var(--color-pending-bg); color: var(--color-pending); }
  footer { margin: 2rem 0 0; padding-top: 1rem; border-top: 1px solid var(--color-border); font-size: 0.74rem; color: var(--color-muted); text-align: center; }

  @page { margin: 14mm; }
  @media print {
    body { background: #fff !important; padding: 0; }
    .sheet { box-shadow: none; border-radius: 0; padding: 0; max-width: none; }
    .print-button { display: none; }
    thead { display: table-header-group; }
    tr, .stat { page-break-inside: avoid; }
    .stat, .badge, tbody tr.row-failed, thead th {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>
</head>
<body>
<div class="sheet">
  <button type="button" class="print-button" onclick="window.print()">Print / Save as PDF</button>

  <p class="eyebrow">${PRODUCT_NAME} &middot; Test Report</p>
  <h1>${escapeHtml(report.suite_name)}</h1>

  <dl class="meta-grid">
    <div><dt>Run</dt><dd>#${report.run_id}</dd></div>
    <div><dt>Run by</dt><dd>${report.created_by ? escapeHtml(report.created_by) : '—'}</dd></div>
    <div><dt>Run started</dt><dd>${formatTimestamp(report.run_date)}</dd></div>
    <div><dt>Report generated</dt><dd>${formatTimestamp(report.generated_at)}</dd></div>
  </dl>

  <div class="summary">
    <div class="stat stat-total"><span class="value">${report.total_count}</span><span class="label">Total</span></div>
    <div class="stat stat-passed"><span class="value">${report.passed_count}</span><span class="label">Passed</span></div>
    <div class="stat stat-failed"><span class="value">${report.failed_count}</span><span class="label">Failed</span></div>
    <div class="stat stat-skipped"><span class="value">${report.skipped_count}</span><span class="label">Skipped</span></div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Test Case</th><th>Status</th><th>Duration</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <footer>Generated by ${PRODUCT_NAME} &middot; Confidential</footer>
</div>
</body>
</html>
`
}

function handleExportReportHtml(req, res) {
  const report = findReport(parseId(req.params.id))
  if (!report) return sendError(res, 404, 'Report not found')

  const safeName = report.suite_name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'report'
  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Disposition': `attachment; filename="report-${report.id}-${safeName}.html"`,
  })
  return res.send(renderReportHtml(report))
}

router.get('/', handleListReports)
router.post('/', handleCreateReport)
router.get('/:id', handleGetReport)
router.get('/:id/export/html', handleExportReportHtml)

module.exports = router
