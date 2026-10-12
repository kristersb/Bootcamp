// The Strata QA mark: a "strata" (layered) motif - two stacked bars reading as sediment layers - topped
// with a checkmark, so the mark reads as "verified layers" at a glance even at nav-bar size.
function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Strata QA logo">
      <rect x="2" y="2" width="28" height="28" rx="8" fill="none" stroke="#06b6d4" strokeWidth="2" />
      <rect x="8" y="20" width="16" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="8" y="15" width="12" height="3" rx="1.5" fill="#94a3b8" />
      <path d="M8 11 L11.5 14.5 L18 8" fill="none" stroke="#06b6d4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default Logo
