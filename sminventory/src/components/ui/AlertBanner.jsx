import { useState } from "react";

export function AlertBanner({ items }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || items.length === 0) return null;

  const preview = items.slice(0, 3).map(i => i.name).join(", ");
  const extra   = items.length > 3 ? ` +${items.length - 3} more` : "";

  return (
    <div className="alert-banner">
      <div className="alert-banner__icon">!</div>
      <div className="alert-banner__body">
        <div className="alert-banner__title">{items.length} item{items.length > 1 ? "s" : ""} need attention</div>
        <div className="alert-banner__desc">{preview}{extra}</div>
      </div>
      <button className="icon-btn" onClick={() => setDismissed(true)} aria-label="Dismiss">&#x2715;</button>
    </div>
  );
}
