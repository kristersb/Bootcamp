import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import TestCasesPage from './pages/TestCasesPage'
import TestCaseImportPage from './pages/TestCaseImportPage'
import TestSuitesPage from './pages/TestSuitesPage'
import TestSuiteDetailPage from './pages/TestSuiteDetailPage'
import BugsPage from './pages/BugsPage'
import BugDetailPage from './pages/BugDetailPage'
import TestRunsPage from './pages/TestRunsPage'
import TestRunDetailPage from './pages/TestRunDetailPage'
import ReportsPage from './pages/ReportsPage'
import ReportDetailPage from './pages/ReportDetailPage'
import FlakyTestsPage from './pages/FlakyTestsPage'
import SettingsPage from './pages/SettingsPage'
import ShortcutManager from './components/ShortcutManager'
import Logo from './components/Logo'
import './App.css'

function App() {
  const [navOpen, setNavOpen] = useState(false)

  // Lets Escape close the mobile drawer from anywhere, same as this app's modals.
  useEffect(() => {
    if (!navOpen) return undefined
    function handleKeyDown(e) {
      if (e.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navOpen])

  function closeNav() {
    setNavOpen(false)
  }

  return (
    <div className="app-shell">
      <ShortcutManager />
      <nav className="app-nav">
        <NavLink to="/" end className="app-brand" onClick={closeNav}>
          <Logo size={26} />
          <span className="app-brand-name">Strata QA</span>
        </NavLink>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={navOpen}
          aria-controls="primary-nav-links"
          aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setNavOpen((open) => !open)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>
        <div id="primary-nav-links" className={`app-nav-links${navOpen ? ' is-open' : ''}`}>
          <NavLink to="/" end onClick={closeNav}>
            Dashboard
          </NavLink>
          <NavLink to="/test-cases" onClick={closeNav}>
            Test Cases
          </NavLink>
          <NavLink to="/test-suites" onClick={closeNav}>
            Test Suites
          </NavLink>
          <NavLink to="/test-runs" onClick={closeNav}>
            Test Runs
          </NavLink>
          <NavLink to="/flaky-tests" onClick={closeNav}>
            Flaky Tests
          </NavLink>
          <NavLink to="/reports" onClick={closeNav}>
            Reports
          </NavLink>
          <NavLink to="/bugs" onClick={closeNav}>
            Bugs
          </NavLink>
          <NavLink to="/settings" onClick={closeNav}>
            Settings
          </NavLink>
        </div>
      </nav>
      {navOpen && <div className="nav-backdrop" onClick={closeNav} />}
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/test-cases" element={<TestCasesPage />} />
          <Route path="/test-cases/import" element={<TestCaseImportPage />} />
          <Route path="/test-suites" element={<TestSuitesPage />} />
          <Route path="/test-suites/:id" element={<TestSuiteDetailPage />} />
          <Route path="/test-runs" element={<TestRunsPage />} />
          <Route path="/test-runs/:id" element={<TestRunDetailPage />} />
          <Route path="/flaky-tests" element={<FlakyTestsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="/bugs" element={<BugsPage />} />
          <Route path="/bugs/:id" element={<BugDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
