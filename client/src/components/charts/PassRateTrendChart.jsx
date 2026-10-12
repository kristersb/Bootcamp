import { useState } from 'react'
import ChartCard from './ChartCard'
import { formatShortDate } from './chart-utils'

const WIDTH = 640
const HEIGHT = 260
const PAD = { left: 46, right: 28, top: 28, bottom: 48 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom
const GRID_TICKS = [0, 50, 100]
const LABEL_ROTATION = -35

// A single continuous series (one hue, no legend box - the title already says what's plotted), consistent with
// "trend over time -> line -> sequential or 1 categorical" for a lone series.
function PassRateTrendChart({ data }) {
  const [hovered, setHovered] = useState(null)

  const n = data.length
  const xFor = (i) => PAD.left + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W)
  const yFor = (value) => PAD.top + (1 - value / 100) * PLOT_H

  // Breaks the line at any run with no judged results yet, instead of drawing a false 0%.
  const segments = []
  let current = []
  data.forEach((point, i) => {
    if (point.pass_rate == null) {
      if (current.length) segments.push(current)
      current = []
    } else {
      current.push({ ...point, i, x: xFor(i), y: yFor(point.pass_rate) })
    }
  })
  if (current.length) segments.push(current)

  const lastValid = [...data].reverse().find((d) => d.pass_rate != null)
  const hoveredPoint = hovered != null ? data[hovered] : null

  const tableRows = data.map((d) => [
    `#${d.run_id}`,
    d.suite_name,
    formatShortDate(d.date),
    d.pass_rate == null ? 'No data' : `${d.pass_rate}%`,
  ])

  return (
    <ChartCard
      title="Pass-rate trend"
      subtitle={`Last ${n || 0} test run${n === 1 ? '' : 's'} - passed / (passed + failed), skipped not counted`}
      tableCaption="Pass rate for the last 10 test runs"
      tableHead={['Run', 'Suite', 'Date', 'Pass rate']}
      tableRows={tableRows}
    >
      {n === 0 ? (
        <p className="chart-empty">No test runs yet.</p>
      ) : (
        <div className="chart-svg-wrap">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Pass rate over the last test runs">
            {GRID_TICKS.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={yFor(tick)}
                  y2={yFor(tick)}
                  className="chart-gridline"
                />
                <text x={PAD.left - 8} y={yFor(tick)} className="chart-axis-label" textAnchor="end" dy="0.32em">
                  {tick}%
                </text>
              </g>
            ))}

            {segments.map((segment, si) => (
              <path
                key={si}
                d={segment.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')}
                className="chart-line"
              />
            ))}

            {segments.flat().map((p) => (
              <circle key={p.i} cx={p.x} cy={p.y} r={hovered === p.i ? 6 : 4.5} className="chart-dot" />
            ))}

            {lastValid && (
              <text
                x={xFor(data.indexOf(lastValid)) + 10}
                y={yFor(lastValid.pass_rate)}
                className="chart-end-label"
                dy="0.32em"
              >
                {lastValid.pass_rate}%
              </text>
            )}

            {hovered != null && (
              <line x1={xFor(hovered)} x2={xFor(hovered)} y1={PAD.top} y2={PAD.top + PLOT_H} className="chart-crosshair" />
            )}

            {data.map((d, i) => (
              <rect
                key={i}
                x={PAD.left + (i / n) * PLOT_W}
                y={PAD.top}
                width={PLOT_W / n}
                height={PLOT_H}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`Run #${d.run_id}, ${d.suite_name}, ${formatShortDate(d.date)}, ${d.pass_rate == null ? 'no data' : `${d.pass_rate}% pass rate`}`}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              />
            ))}

            {data.map((d, i) => (
              <text
                key={i}
                x={xFor(i)}
                y={HEIGHT - 16}
                className="chart-axis-label"
                textAnchor="end"
                transform={`rotate(${LABEL_ROTATION} ${xFor(i)} ${HEIGHT - 16})`}
              >
                {formatShortDate(d.date)}
              </text>
            ))}
          </svg>

          {hoveredPoint && (
            <div
              className="chart-tooltip"
              style={{ left: `${(xFor(hovered) / WIDTH) * 100}%`, top: `${(yFor(hoveredPoint.pass_rate ?? 50) / HEIGHT) * 100}%` }}
            >
              <strong>{hoveredPoint.pass_rate == null ? 'No data' : `${hoveredPoint.pass_rate}%`}</strong>
              <span>
                {hoveredPoint.suite_name} &middot; Run #{hoveredPoint.run_id}
              </span>
              <span>{formatShortDate(hoveredPoint.date)}</span>
            </div>
          )}
        </div>
      )}
    </ChartCard>
  )
}

export default PassRateTrendChart
