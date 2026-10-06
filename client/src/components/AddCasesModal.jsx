import { useEffect, useState } from 'react'
import { listTestCases } from '../api/testCases'
import SeverityBadge from './SeverityBadge'
import './TestCaseFormModal.css'
import './AddCasesModal.css'

function AddCasesModal({ existingIds, busy = false, onAdd, onClose }) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addingId, setAddingId] = useState(null)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listTestCases({ search, sort: 'updated_at', order: 'desc', page: 1 })
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
        setTotal(data.total)
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
  }, [search])

  async function handleAdd(testCase) {
    setAddingId(testCase.id)
    setError('')
    try {
      await onAdd(testCase.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card wide" role="dialog" aria-modal="true" aria-labelledby="add-cases-title">
        <div className="modal-header">
          <h2 id="add-cases-title">Add Test Cases</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <input
          type="search"
          className="picker-search"
          placeholder="Search test cases by title..."
          aria-label="Search test cases by title"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          autoFocus
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <ul className="picker-list">
          {!loading && items.length === 0 && <li className="picker-empty">No test cases match your search.</li>}
          {items.map((testCase) => {
            const alreadyAdded = existingIds.has(testCase.id)
            return (
              <li className="picker-row" key={testCase.id}>
                <span className="picker-title">{testCase.title}</span>
                <SeverityBadge severity={testCase.severity} />
                <button
                  type="button"
                  className="btn-secondary picker-add"
                  disabled={alreadyAdded || busy || addingId === testCase.id}
                  aria-label={alreadyAdded ? `${testCase.title} is already in this suite` : `Add ${testCase.title}`}
                  onClick={() => handleAdd(testCase)}
                >
                  {alreadyAdded ? 'Added' : addingId === testCase.id ? 'Adding...' : 'Add'}
                </button>
              </li>
            )
          })}
        </ul>

        {total > items.length && (
          <p className="picker-note">
            Showing the first {items.length} of {total} matches. Refine your search to find others.
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddCasesModal
