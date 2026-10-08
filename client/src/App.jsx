import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import TestCasesPage from './pages/TestCasesPage'
import TestSuitesPage from './pages/TestSuitesPage'
import TestSuiteDetailPage from './pages/TestSuiteDetailPage'
import BugsPage from './pages/BugsPage'
import BugDetailPage from './pages/BugDetailPage'
import TestRunsPage from './pages/TestRunsPage'
import TestRunDetailPage from './pages/TestRunDetailPage'
import ReportsPage from './pages/ReportsPage'
import ReportDetailPage from './pages/ReportDetailPage'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        <NavLink to="/test-cases">Test Cases</NavLink>
        <NavLink to="/test-suites">Test Suites</NavLink>
        <NavLink to="/test-runs">Test Runs</NavLink>
        <NavLink to="/reports">Reports</NavLink>
        <NavLink to="/bugs">Bugs</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/test-cases" element={<TestCasesPage />} />
          <Route path="/test-suites" element={<TestSuitesPage />} />
          <Route path="/test-suites/:id" element={<TestSuiteDetailPage />} />
          <Route path="/test-runs" element={<TestRunsPage />} />
          <Route path="/test-runs/:id" element={<TestRunDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="/bugs" element={<BugsPage />} />
          <Route path="/bugs/:id" element={<BugDetailPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
