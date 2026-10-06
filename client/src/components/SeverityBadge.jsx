import './SeverityBadge.css'

function SeverityBadge({ severity }) {
  return <span className={`severity-badge severity-${severity.toLowerCase()}`}>{severity}</span>
}

export default SeverityBadge
