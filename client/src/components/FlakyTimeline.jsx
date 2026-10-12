import './FlakyTimeline.css'

// Renders a case's chronological pass/fail/skip history as a row of small pills, oldest first.
function FlakyTimeline({ history }) {
  return (
    <span
      className="flaky-timeline"
      role="img"
      aria-label={`Result history, oldest to newest: ${history.map((h) => h.result ?? 'pending').join(', ')}`}
    >
      {history.map((h, index) => (
        <span
          key={h.run_id ?? index}
          className={`timeline-pill timeline-pill-${h.result ?? 'pending'}`}
          title={`Run #${h.run_id}: ${h.result ?? 'pending'}`}
        />
      ))}
    </span>
  )
}

export default FlakyTimeline
