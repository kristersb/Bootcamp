import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { runStatusLabel } from '../constants/test-run'
import { getDashboardMetrics } from '../api/dashboard'
import { describeActivity } from '../utils/describe-activity'
import { formatDate } from '../utils/format-date'
import { formatDuration } from '../utils/format-duration'
import './TestCasesPage.css'
import './DashboardPage.css'

const REFRESH_MS = 30_000

// `muted` is the neutral look for a value that does not exist yet ("—"). `action` is a next step shown as a link.
function MetricCard({ label, value, hint, muted = false, action }) {
  return (
    <div className="metric-card">
      <dt className="metric-label">{label}</dt>
      <dd className={`metric-value${muted ? ' metric-value-muted' : ''}`}>{value}</dd>
      <dd className="metric-hint">{hint}</dd>
      {action && (
        <dd className="metric-action">
          <Link to={action.to}>{action.label}</Link>
        </dd>
      )}
    </div>
  )
}

// What a panel shows when it has nothing to list: what it is for, and the one thing to do next.
function PanelEmpty({ icon, title, children, action }) {
  return (
    <div className="panel-empty">
      <span className="panel-empty-icon" aria-hidden="true">
        {icon}
      </span>
      <p className="panel-empty-title">{title}</p>
      <p className="panel-empty-text">{children}</p>
      <Link className="panel-empty-action" to={action.to}>
        {action.label}
      </Link>
    </div>
  )
}

// What the four cards say. Each one explains its own empty state and points at what fills it.
function buildMetricCards(data) {
  const { metrics, recent_runs: runs } = data

  const passRate =
    metrics.pass_rate !== null
      ? { value: `${metrics.pass_rate}%`, hint: 'Passed ÷ (passed + failed), skipped not counted' }
      : runs.length === 0
        ? { value: '—', hint: 'Complete a test run to see your pass rate', action: { to: '/test-suites', label: 'Start a run' } }
        : { value: '—', hint: 'No passed or failed results yet. Skipped cases do not count.', action: runs[0] && { to: `/test-runs/${runs[0].id}`, label: 'Open the latest run' } }

  const totalBugs = metrics.total_bugs ?? metrics.open_bugs // an older server may not send the total
  const openBugs =
    totalBugs === 0
      ? { value: 0, hint: 'No bugs filed yet', action: { to: '/bugs', label: 'Report a bug' } }
      : metrics.open_bugs === 0
        ? { value: 0, hint: `All ${totalBugs} bug${totalBugs === 1 ? ' is' : 's are'} resolved or closed` }
        : { value: metrics.open_bugs, hint: 'Open, in progress or reopened' }

  const duration = formatDuration(metrics.average_run_duration_ms)

  return [
    {
      label: 'Test cases',
      value: metrics.total_test_cases,
      hint: metrics.total_test_cases === 0 ? 'No test cases yet' : 'In the library',
      action: metrics.total_test_cases === 0 ? { to: '/test-cases', label: 'Create a test case' } : undefined,
      muted: metrics.total_test_cases === 0,
    },
    { label: 'Pass rate', muted: metrics.pass_rate === null, ...passRate },
    { label: 'Open bugs', muted: totalBugs === 0, ...openBugs },
    {
      label: 'Avg. run duration',
      value: duration ?? '—',
      muted: duration === null,
      hint: duration === null ? 'No time recorded yet. Enter a time on a result in a run.' : 'Recorded time per run',
    },
  ]
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <p className="visually-hidden" role="status">
        Loading the dashboard.
      </p>
      <div className="metric-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="metric-card">
            <span className="skeleton skeleton-label" />
            <span className="skeleton skeleton-value" />
            <span className="skeleton skeleton-hint" />
          </div>
        ))}
      </div>
      <div className="dashboard-panels" aria-hidden="true">
        {[0, 1].map((panel) => (
          <section key={panel} className="dashboard-panel">
            <span className="skeleton skeleton-heading" />
            {[0, 1, 2, 3, 4].map((row) => (
              <span key={row} className="skeleton skeleton-row" />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const inFlight = useRef(false)
  const lastLoad = useRef(0)

  // One request at a time, so a slow response can never overwrite a newer one.
  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setRefreshing(true)
    try {
      setData(await getDashboardMetrics())
      setUpdatedAt(new Date())
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      lastLoad.current = Date.now()
      inFlight.current = false
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (!document.hidden) load()
    }, REFRESH_MS)
    // Timers are paused in background tabs, so catch up as soon as the tab is visible again.
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastLoad.current >= REFRESH_MS) load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const metrics = data?.metrics

  return (
    <div className="test-cases-page">
      <div className="test-cases-header dashboard-header">
        <h1>Dashboard</h1>
        <div className="dashboard-refresh">
          {updatedAt && (
            <span>
              Updated {updatedAt.toLocaleTimeString(undefined, { timeStyle: 'medium' })} · refreshes every 30 s
            </span>
          )}
          <button type="button" className="btn-secondary" disabled={refreshing} onClick={load}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && <DashboardSkeleton />}

      {!loading && error && !data && (
        <div className="list-error" role="alert">
          <span>Could not load the dashboard. {error}</span>
          <button type="button" className="btn-secondary" disabled={refreshing} onClick={load}>
            Try again
          </button>
        </div>
      )}

      {data && error && (
        <div className="list-error" role="alert">
          <span>
            Could not refresh. Showing the data from {updatedAt?.toLocaleTimeString(undefined, { timeStyle: 'medium' })}. {error}
          </span>
        </div>
      )}

      {data && (
        <>
          <dl className="metric-grid">
            {buildMetricCards(data).map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </dl>

          <div className="dashboard-panels">
            <section className="dashboard-panel" aria-labelledby="recent-runs-heading">
              <h2 id="recent-runs-heading">Recent test runs</h2>
              {data.recent_runs.length === 0 ? (
                <PanelEmpty
                  icon="▶"
                  title="No test runs yet"
                  action={{ to: '/test-suites', label: 'Go to Test Suites' }}
                >
                  Run your first test suite to see results here. Open a suite and press New Run.
                </PanelEmpty>
              ) : (
                <div className="table-scroll">
                  <table className="test-cases-table dashboard-runs-table">
                    <caption className="visually-hidden">The 10 most recent test runs</caption>
                    <colgroup>
                      <col />
                      <col className="col-dashboard-result" />
                      <col className="col-dashboard-status" />
                      <col className="col-dashboard-when" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Suite</th>
                        <th>Passed / failed</th>
                        <th>Status</th>
                        <th>Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_runs.map((run) => (
                        <tr key={run.id}>
                          <td>
                            <Link className="bug-link" to={`/test-runs/${run.id}`}>
                              {run.suite_name}
                            </Link>{' '}
                            <span className="run-number">Run #{run.id}</span>
                          </td>
                          <td>
                            {run.pass_count} / {run.fail_count}
                          </td>
                          <td>
                            <span className="status-pill">{runStatusLabel(run)}</span>
                          </td>
                          <td>{formatDate(run.start_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="dashboard-panel" aria-labelledby="recent-activity-heading">
              <h2 id="recent-activity-heading">Recent activity</h2>
              {data.recent_activity.length === 0 ? (
                <PanelEmpty icon="✎" title="No activity yet" action={{ to: '/bugs', label: 'Report a bug' }}>
                  Bug reports, status changes and comments show up here as they happen.
                </PanelEmpty>
              ) : (
                <ul className="activity-feed">
                  {data.recent_activity.map((item) => (
                    <li key={item.id}>
                      <Link className="bug-link" to={`/bugs/${item.bug_id}`}>
                        {describeActivity(item)}
                      </Link>
                      <span className="activity-title">{item.bug_title}</span>
                      <span className="activity-when">{formatDate(item.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default DashboardPage
