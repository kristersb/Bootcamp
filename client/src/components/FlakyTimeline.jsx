import './FlakyTimeline.css'

// A single result's shape, shared by the timeline (per-run, with a hover title) and the page's legend
// (one of each, title-less). Skipped is an SVG triangle, not a clipped div: a clip-path on a bordered box
// only keeps the border on the edge that coincides with the box's own edge (here, the bottom), so the two
// diagonal sides render with no stroke at all - an SVG polygon strokes all three sides evenly.
export function TimelinePill({ result, title, ...rest }) {
  const className = `timeline-pill timeline-pill-${result ?? 'pending'}`
  if (result === 'skipped') {
    return (
      <svg className={className} viewBox="0 0 10 10" width="10" height="10" {...rest}>
        {title && <title>{title}</title>}
        <polygon points="5,0.5 9.5,9.5 0.5,9.5" />
      </svg>
    )
  }
  return <span className={className} title={title} {...rest} />
}

// Renders a case's chronological pass/fail/skip history as a row of small pills, oldest first.
function FlakyTimeline({ history }) {
  return (
    <span
      className="flaky-timeline"
      role="img"
      aria-label={`Result history, oldest to newest: ${history.map((h) => h.result ?? 'pending').join(', ')}`}
    >
      {history.map((h, index) => (
        <TimelinePill key={h.run_id ?? index} result={h.result} title={`Run #${h.run_id}: ${h.result ?? 'pending'}`} />
      ))}
    </span>
  )
}

export default FlakyTimeline
