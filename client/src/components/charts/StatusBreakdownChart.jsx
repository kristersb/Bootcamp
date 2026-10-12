import { useId, useState } from 'react'
import ChartCard from './ChartCard'
import { readableTextOn } from './chart-utils'

const WIDTH = 640
const BAR_HEIGHT = 48
const PAD_Y = 14
const HEIGHT = BAR_HEIGHT + PAD_Y * 2
const GAP = 2
const LABEL_SHARE_THRESHOLD = 0.08

const STATUS_LABELS = { draft: 'Draft', ready: 'Ready', passed: 'Passed', failed: 'Failed', skipped: 'Skipped' }

// Displayed in a different order than the data arrives (draft/ready/passed/failed/skipped, per CLAUDE.md) so
// that "passed" (status-good green) and "failed" (status-critical red) never sit next to each other: validated
// with scripts/validate_palette.js, a pass/fail pair this close reads as the same color under deuteranopia
// (ΔE 4.1, below the hard floor of 6 - no amount of labeling rescues that). Separated by "draft" and "ready",
// the full 5-color set clears every adjacency check in both light and dark mode.
const DISPLAY_ORDER = ['passed', 'draft', 'ready', 'failed', 'skipped']

// "draft" and "skipped" are deliberately desaturated neutrals, not identity-carrying hues, so they read (and
// validate) like this project's existing status/chrome tones rather than an 8-slot categorical palette - the
// same reason the validator's chroma-floor check doesn't apply to a status or axis-label color either.
const STATUS_COLORS = {
  passed: 'var(--status-good)',
  draft: 'var(--status-draft)',
  ready: 'var(--status-info)',
  failed: 'var(--status-critical)',
  skipped: 'var(--status-skipped)',
}
const STATUS_HEX = { passed: '#0ca30c', draft: '#9c9690', ready: '#2a78d6', failed: '#d03b3b', skipped: '#64748b' }

// Part-to-whole as a single stacked bar, not a 5-slice donut: a donut's legend puts every wedge color beside
// every other, and 5 slices fail that all-pairs colorblind check with this palette, while the same colors pass
// cleanly as adjacent bar segments (only neighbors need to clear the gate). See chat for the validator readout.
function StatusBreakdownChart({ data }) {
  const uid = useId()
  const [hovered, setHovered] = useState(null)
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const byStatus = Object.fromEntries(data.map((d) => [d.status, d]))
  const ordered = DISPLAY_ORDER.map((status) => byStatus[status]).filter(Boolean)

  const segments = ordered.reduce((acc, d, i) => {
    const share = total === 0 ? 0 : d.count / total
    const width = share * WIDTH
    const x = i === 0 ? 0 : acc[i - 1].x + acc[i - 1].width
    acc.push({ ...d, i, x, width, share })
    return acc
  }, [])

  const tableRows = ordered.map((d) => [
    STATUS_LABELS[d.status],
    d.count,
    total === 0 ? '0%' : `${Math.round((d.count / total) * 1000) / 10}%`,
  ])

  return (
    <ChartCard
      title="Test coverage by status"
      subtitle={total === 0 ? 'No test cases yet' : `${total} test case${total === 1 ? '' : 's'} total`}
      legend={ordered.map((d) => ({ label: `${STATUS_LABELS[d.status]} (${d.count})`, color: STATUS_COLORS[d.status] }))}
      tableCaption="Test cases by status"
      tableHead={['Status', 'Count', 'Share']}
      tableRows={tableRows}
    >
      {total === 0 ? (
        <p className="chart-empty">No test cases yet.</p>
      ) : (
        <div className="chart-svg-wrap">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Test case count by status">
            <defs>
              <clipPath id={`${uid}-clip`}>
                <rect x={0} y={PAD_Y} width={WIDTH} height={BAR_HEIGHT} rx={8} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${uid}-clip)`}>
              {segments.map((seg) => (
                <rect
                  key={seg.status}
                  x={seg.x + (seg.i > 0 ? GAP : 0)}
                  y={PAD_Y}
                  width={Math.max(0, seg.width - (seg.i > 0 ? GAP : 0) - (seg.i < segments.length - 1 ? GAP : 0))}
                  height={BAR_HEIGHT}
                  style={{ fill: STATUS_COLORS[seg.status], opacity: hovered === null || hovered === seg.i ? 1 : 0.5 }}
                />
              ))}
            </g>

            {segments
              .filter((seg) => seg.share >= LABEL_SHARE_THRESHOLD)
              .map((seg) => (
                <text
                  key={seg.status}
                  x={seg.x + seg.width / 2}
                  y={PAD_Y + BAR_HEIGHT / 2}
                  textAnchor="middle"
                  dy="0.32em"
                  className="chart-segment-label"
                  fill={readableTextOn(STATUS_HEX[seg.status])}
                >
                  {seg.count}
                </text>
              ))}

            {segments.map((seg) => (
              <rect
                key={seg.status}
                x={seg.x}
                y={PAD_Y}
                width={seg.width}
                height={BAR_HEIGHT}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${STATUS_LABELS[seg.status]}: ${seg.count} test case${seg.count === 1 ? '' : 's'}, ${Math.round(seg.share * 1000) / 10}%`}
                onPointerEnter={() => setHovered(seg.i)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(seg.i)}
                onBlur={() => setHovered(null)}
              />
            ))}
          </svg>

          {hovered != null && (
            <div
              className="chart-tooltip"
              style={{
                left: `${((segments[hovered].x + segments[hovered].width / 2) / WIDTH) * 100}%`,
                top: `${(PAD_Y / HEIGHT) * 100}%`,
              }}
            >
              <strong>{segments[hovered].count}</strong>
              <span>{STATUS_LABELS[segments[hovered].status]}</span>
              <span>{Math.round(segments[hovered].share * 1000) / 10}% of total</span>
            </div>
          )}
        </div>
      )}
    </ChartCard>
  )
}

export default StatusBreakdownChart
