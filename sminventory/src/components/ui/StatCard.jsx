export function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="stat-card__value" style={{ color: accent }}>{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}
