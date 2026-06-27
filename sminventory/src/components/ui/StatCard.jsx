export function StatCard({ label, value, accent, onClick, active = false }) {
  const clickable = typeof onClick === "function";

  return (
    <div
      className={`stat-card ${clickable ? "stat-card--clickable" : ""} ${active ? "stat-card--active" : ""}`}
      style={{ borderTop: `3px solid ${accent}` }}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
      } : undefined}
    >
      <div className="stat-card__value" style={{ color: accent }}>{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}