import { useState } from 'react'
import ChartCard from './ChartCard'
import { formatShortDate, formatWeekRangeLabel, niceMax } from './chart-utils'

const WIDTH = 640
const HEIGHT = 260
const PAD = { left: 38, right: 24, top: 20, bottom: 48 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom
const BAR_GAP = 4
const CORNER = 3
const LABEL_ROTATION = -35

// Rounded top, square baseline (the bar mark spec): draw the rounded rect, then paint over its bottom corners
// with a plain square rect of the same height as the radius, same fill.
function Bar({ x, width, y, height, className }) {
  if (height <= 0) return null
  const r = Math.min(CORNER, width / 2, height)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={r} className={className} />
      {height > r && <rect x={x} y={y + height - r} width={width} height={r} className={className} />}
    </g>
  )
}

function BugsPerWeekChart({ data }) {
  const [hovered, setHovered] = useState(null)

  const n = data.length
  const yMax = niceMax(Math.max(1, ...data.map((d) => d.opened), ...data.map((d) => d.closed)))
  const ticks = [0, Math.round(yMax / 2), yMax]

  const groupWidth = n ? PLOT_W / n : PLOT_W
  const barWidth = Math.min(24, groupWidth * 0.32)
  const groupInnerWidth = barWidth * 2 + BAR_GAP
  const yFor = (value) => PAD.top + PLOT_H - (value / yMax) * PLOT_H
  const groupX = (i) => PAD.left + i * groupWidth + (groupWidth - groupInnerWidth) / 2

  const hoveredWeek = hovered != null ? data[hovered] : null
  const tableRows = data.map((d) => [formatWeekRangeLabel(d.week_start), d.opened, d.closed])

  return (
    <ChartCard
      title="Bugs opened vs. closed"
      subtitle="Last 8 weeks"
      legend={[
        { label: 'Opened', color: 'var(--series-1)' },
        { label: 'Closed', color: 'var(--series-2)' },
      ]}
      tableCaption="Bugs opened and closed per week for the last 8 weeks"
      tableHead={['Week', 'Opened', 'Closed']}
      tableRows={tableRows}
    >
      {n === 0 ? (
        <p className="chart-empty">No data yet.</p>
      ) : (
        <div className="chart-svg-wrap">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Bugs opened vs closed per week">
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yFor(tick)} y2={yFor(tick)} className="chart-gridline" />
                <text x={PAD.left - 8} y={yFor(tick)} className="chart-axis-label" textAnchor="end" dy="0.32em">
                  {tick}
                </text>
              </g>
            ))}

            {data.map((week, i) => {
              const x = groupX(i)
              const openedHeight = (week.opened / yMax) * PLOT_H
              const closedHeight = (week.closed / yMax) * PLOT_H
              return (
                <g key={i} className={hovered === i ? 'chart-bar-group is-hovered' : 'chart-bar-group'}>
                  <Bar x={x} width={barWidth} y={yFor(week.opened)} height={openedHeight} className="chart-fill-series-1" />
                  <Bar
                    x={x + barWidth + BAR_GAP}
                    width={barWidth}
                    y={yFor(week.closed)}
                    height={closedHeight}
                    className="chart-fill-series-2"
                  />
                </g>
              )
            })}

            {data.map((week, i) => (
              <rect
                key={i}
                x={PAD.left + i * groupWidth}
                y={PAD.top}
                width={groupWidth}
                height={PLOT_H}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`Week of ${formatWeekRangeLabel(week.week_start)}: ${week.opened} opened, ${week.closed} closed`}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              />
            ))}

            {data.map((week, i) => {
              const lx = PAD.left + i * groupWidth + groupWidth / 2
              const ly = HEIGHT - 16
              return (
                <text key={i} x={lx} y={ly} className="chart-axis-label" textAnchor="end" transform={`rotate(${LABEL_ROTATION} ${lx} ${ly})`}>
                  {formatShortDate(week.week_start)}
                </text>
              )
            })}
          </svg>

          {hoveredWeek && (
            <div
              className="chart-tooltip"
              style={{
                left: `${((PAD.left + hovered * groupWidth + groupWidth / 2) / WIDTH) * 100}%`,
                top: `${(yFor(Math.max(hoveredWeek.opened, hoveredWeek.closed)) / HEIGHT) * 100}%`,
              }}
            >
              <strong>{formatWeekRangeLabel(hoveredWeek.week_start)}</strong>
              <span>Opened: {hoveredWeek.opened}</span>
              <span>Closed: {hoveredWeek.closed}</span>
            </div>
          )}
        </div>
      )}
    </ChartCard>
  )
}

export default BugsPerWeekChart
