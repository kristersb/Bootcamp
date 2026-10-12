import { useId } from 'react'

// Every chart's accessible twin: a plain HTML table with the same numbers, always reachable without hovering
// anything. `tableRows` is an array of arrays of already-formatted cell strings.
function ChartCard({ title, subtitle, legend, children, tableCaption, tableHead, tableRows }) {
  const uid = useId()

  return (
    <figure className="chart-card" aria-labelledby={`${uid}-title`}>
      <figcaption>
        <h3 id={`${uid}-title`}>{title}</h3>
        {subtitle && <p className="chart-subtitle">{subtitle}</p>}
      </figcaption>

      {legend && (
        <ul className="chart-legend" role="list">
          {legend.map((item) => (
            <li key={item.label}>
              <span className="chart-legend-swatch" style={{ background: item.color }} aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      {children}

      <details className="chart-table-toggle">
        <summary>View as table</summary>
        <div className="table-scroll">
          <table className="test-cases-table chart-table">
            <caption className="visually-hidden">{tableCaption}</caption>
            <thead>
              <tr>
                {tableHead.map((head) => (
                  <th key={head}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={tableHead.length} className="empty-row">
                    No data yet.
                  </td>
                </tr>
              ) : (
                tableRows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

export default ChartCard
