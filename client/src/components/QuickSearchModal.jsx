import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listTestCases } from '../api/testCases'
import { listBugs } from '../api/bugs'
import { listTestSuites } from '../api/test-suites'
import { useDialog } from '../hooks/use-dialog'
import './QuickSearchModal.css'

const DEBOUNCE_MS = 250
const MAX_PER_GROUP = 5

function QuickSearchModal({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  // The test-suites API has no search param (the list is small and unpaginated), so it's fetched once and
  // filtered client-side below, instead of round-tripping it on every keystroke like the other two entities.
  const [allSuites, setAllSuites] = useState(null)
  const [groups, setGroups] = useState({ testCases: [], bugs: [], suites: [] })
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const dialogRef = useRef(null)
  const inputRef = useRef(null)

  useDialog({ dialogRef, initialFocusRef: inputRef, onRequestClose: onClose })

  useEffect(() => {
    listTestSuites()
      .then((data) => setAllSuites(data.items))
      .catch(() => setAllSuites([]))
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    if (!debounced || allSuites === null) {
      setGroups({ testCases: [], bugs: [], suites: [] })
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setSearchError('')

    Promise.all([listTestCases({ search: debounced, page: 1 }), listBugs({ search: debounced, page: 1 })])
      .then(([testCaseData, bugData]) => {
        if (cancelled) return
        const needle = debounced.toLowerCase()
        const suiteMatches = allSuites.filter(
          (suite) => suite.name.toLowerCase().includes(needle) || suite.feature.toLowerCase().includes(needle)
        )
        setGroups({
          testCases: testCaseData.items.slice(0, MAX_PER_GROUP),
          bugs: bugData.items.slice(0, MAX_PER_GROUP),
          suites: suiteMatches.slice(0, MAX_PER_GROUP),
        })
        setActiveIndex(0)
      })
      .catch((err) => {
        if (!cancelled) setSearchError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debounced, allSuites])

  // Test cases have no detail route in this app (they're edited via a modal on the list page), so a test
  // case result opens that list rather than a per-item page; bugs and suites have real detail pages.
  const results = [
    ...groups.testCases.map((tc) => ({ key: `tc-${tc.id}`, group: 'Test Case', label: tc.title, to: '/test-cases' })),
    ...groups.bugs.map((bug) => ({ key: `bug-${bug.id}`, group: 'Bug', label: bug.title, to: `/bugs/${bug.id}` })),
    ...groups.suites.map((suite) => ({
      key: `suite-${suite.id}`,
      group: 'Test Suite',
      label: suite.name,
      to: `/test-suites/${suite.id}`,
    })),
  ]

  function selectResult(result) {
    navigate(result.to)
    onClose()
  }

  function handleInputKeyDown(e) {
    if (results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selectResult(results[activeIndex])
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-card quick-search-card"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
      >
        <input
          ref={inputRef}
          type="text"
          className="quick-search-input"
          placeholder="Search test cases, bugs and test suites..."
          value={query}
          maxLength={200}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          role="combobox"
          aria-label="Quick search"
          aria-expanded={results.length > 0}
          aria-controls="quick-search-results"
          aria-activedescendant={results[activeIndex]?.key}
        />

        {searchError && (
          <p className="form-error" role="alert">
            Search failed: {searchError}
          </p>
        )}

        <ul className="quick-search-results" id="quick-search-results" role="listbox">
          {!debounced && (
            <li className="quick-search-hint">Start typing to search across test cases, bugs and test suites.</li>
          )}
          {debounced && !loading && !searchError && results.length === 0 && (
            <li className="quick-search-hint">No matches for &quot;{debounced}&quot;.</li>
          )}
          {results.map((result, index) => (
            <li
              key={result.key}
              id={result.key}
              role="option"
              aria-selected={index === activeIndex}
              className={`quick-search-result${index === activeIndex ? ' is-active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault()
                selectResult(result)
              }}
            >
              <span className="quick-search-result-type">{result.group}</span>
              <span className="quick-search-result-label">{result.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default QuickSearchModal
