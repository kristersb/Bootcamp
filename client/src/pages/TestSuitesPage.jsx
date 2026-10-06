import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SUITE_STATUSES } from '../constants/test-suite'
import { listTestSuites } from '../api/test-suites'
import { formatDate } from '../utils/format-date'
import TestSuiteFormModal from '../components/TestSuiteFormModal'
import './TestCasesPage.css'
import './TestSuitesPage.css'

function TestSuitesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    listTestSuites({ status })
      .then((data) => {
        if (!cancelled) setItems(data.items)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status])

  return (
    <div className="test-cases-page">
      <div className="test-cases-header">
        <h1>Test Suites</h1>
        <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
          + New Suite
        </button>
      </div>

      <div className="test-cases-toolbar">
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {SUITE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="table-scroll">
      <table className="test-cases-table">
        <colgroup>
          <col />
          <col className="col-feature" />
          <col className="col-status" />
          <col className="col-count" />
          <col className="col-date" />
        </colgroup>
        <thead>
          <tr>
            <th>Name</th>
            <th>Feature</th>
            <th>Status</th>
            <th>Cases</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-row">
                {status ? `No suites with status "${status}".` : 'No test suites yet. Create one to get started.'}
              </td>
            </tr>
          )}
          {items.map((suite) => (
            <tr key={suite.id}>
              <td>
                <Link className="suite-link" to={`/test-suites/${suite.id}`}>
                  {suite.name}
                </Link>
              </td>
              <td>{suite.feature}</td>
              <td>
                <span className="status-pill">{suite.status}</span>
              </td>
              <td>{suite.case_count}</td>
              <td>{formatDate(suite.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {showForm && (
        <TestSuiteFormModal
          onClose={() => setShowForm(false)}
          onSaved={(suite) => navigate(`/test-suites/${suite.id}`)}
        />
      )}
    </div>
  )
}

export default TestSuitesPage
