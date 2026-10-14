export const RUN_STATUSES = ['in-progress', 'passed', 'failed']

// Keep in sync with LIMITS in server/routes/test-runs.js.
export const RUN_LIMITS = {
  notes: 2000,
  maxSeconds: 24 * 60 * 60,
}

// A run that has every outcome but is not completed yet is waiting for someone to lock it.
export function runStatusLabel(run) {
  if (run.status === 'in-progress') return run.pending_count === 0 ? 'ready to complete' : 'in progress'
  return run.status
}

// The status-pill color modifier for a run: reuses the same shared classes (status-pill-ready,
// status-pill-in-progress, status-pill-passed, status-pill-failed) as test suite/bug status elsewhere,
// split the same way runStatusLabel splits its text - "ready to complete" colors like "ready", not
// like an in-progress run still waiting on outcomes.
export function runStatusClass(run) {
  if (run.status === 'in-progress') return run.pending_count === 0 ? 'ready' : 'in-progress'
  return run.status
}
