import { useEffect, useState } from 'react'
import { getFlakyLeaderboard } from '../api/flaky-tests'
import SeverityBadge from '../components/SeverityBadge'
import FlakyTimeline, { TimelinePill } from '../components/FlakyTimeline'
import './TestCasesPage.css'
import './FlakyTestsPage.css'

function FlakyTestsPage() {
  const [items, setItems] = useState([])
  const [minQualifyingResults, setMinQualifyingResults] = useState(null)
  const [minRuns, setMinRuns] = useState(null)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setListError('')

    getFlakyLeaderboard(10)
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
        setMinQualifyingResults(data.min_qualifying_results)
        setMinRuns(data.min_runs)
      })
      .catch((err) => {
        if (cancelled) return
        setListError(err.message)
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshToken])

  function refresh() {
    setRefreshToken((t) => t + 1)
  }

  const liveMessage = loading
    ? 'Loading the flaky test leaderboard.'
    : listError
      ? ''
      : `${items.length} flaky test case${items.length === 1 ? '' : 's'} found.`

  return (
    <div className="test-cases-page">
      <div className="test-cases-header">
        <h1>Flaky Test Tracker</h1>
      </div>

      <p className="flaky-tests-intro">
        Ranks test cases whose results flip between passed and failed across runs, with at least{' '}
        {minQualifyingResults ?? '…'} recorded pass/fail results across at least {minRuns ?? '…'} different runs
        needed before a case is scored. Skipped and pending results aren&apos;t counted as flips, but still show
        in the timeline below.
      </p>

      <p className="visually-hidden" role="status">
        {liveMessage}
      </p>

      {listError && (
        <div className="list-error" role="alert">
          <span>{listError}</span>
          <button type="button" className="btn-secondary" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      {!listError && (
        <ul className="flaky-timeline-legend" role="list">
          <li>
            <TimelinePill result="passed" aria-hidden="true" /> Passed
          </li>
          <li>
            <TimelinePill result="failed" aria-hidden="true" /> Failed
          </li>
          <li>
            <TimelinePill result="skipped" aria-hidden="true" /> Skipped
          </li>
          <li>
            <TimelinePill result="pending" aria-hidden="true" /> Pending
          </li>
        </ul>
      )}

      {!listError && (
        <div className="table-scroll">
          <table className="test-cases-table flaky-tests-table" aria-busy={loading}>
            <caption className="visually-hidden">Top flaky test cases</caption>
            <colgroup>
              <col />
              <col className="col-severity" />
              <col className="col-flaky-score" />
              <col className="col-flaky-flips" />
              <col className="col-flaky-timeline" />
              <col className="col-flaky-hypothesis" />
            </colgroup>
            <thead>
              <tr>
                <th>Title</th>
                <th>Severity</th>
                <th>Score</th>
                <th>Flips</th>
                <th>Timeline</th>
                <th>Root-cause hypothesis</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    Loading flaky test cases...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    No test case currently qualifies as flaky - nothing has flipped between passed and failed
                    across enough runs yet.
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.test_case_id}>
                  <td>{item.case_title}</td>
                  <td>
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td className="flaky-score-cell">{item.score}%</td>
                  <td>{item.transitions}</td>
                  <td>
                    <FlakyTimeline history={item.history} />
                  </td>
                  <td className="flaky-hypothesis-cell">
                    {item.hypothesis || <span className="flaky-hypothesis-empty">No hypothesis yet.</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default FlakyTestsPage
