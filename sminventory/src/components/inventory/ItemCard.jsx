import { Badge } from "../ui/Badge";
import { getStatus } from "../../utils/statusUtils";
import { formatDateShort } from "../../utils/dateUtils";

export function ItemCard({ item, selected, onSelect, onEdit, onDelete }) {
  const status = getStatus(item.expirationDate);

  const borderColor = {
    fresh:   "var(--status-fresh-border)",
    warning: "var(--status-warning-border)",
    expired: "var(--status-expired-border)",
  }[status.key];

  return (
    <div className={`item-card ${selected ? "item-card--selected" : ""}`} style={{ borderLeftColor: borderColor }}>
      <div className="item-card__check">
        <input
          type="checkbox"
          className="checkbox"
          checked={selected}
          onChange={() => onSelect(item.id)}
          onClick={e => e.stopPropagation()}
        />
      </div>

      <div className="item-card__header">
        <div>
          <div className="item-card__name">{item.name}</div>
          {item.brand && <div className="item-card__brand">{item.brand}</div>}
        </div>
        <div className="item-card__actions">
          <button className="icon-btn" onClick={() => onEdit(item)} title="Edit" aria-label="Edit item">
            <EditIcon />
          </button>
          <button className="icon-btn icon-btn--danger" onClick={() => onDelete(item)} title="Delete" aria-label="Delete item">
            <TrashIcon />
          </button>
        </div>
      </div>

      <div className="item-card__badges">
        <Badge status={status.key}>
          {status.label}{status.days >= 0 ? ` · ${status.days}d` : ""}
        </Badge>
        <Badge status="neutral">{item.category}</Badge>
        <Badge status="neutral">{item.location}</Badge>
      </div>

      <div className="item-card__meta">
        <span>Qty: <strong>{item.quantity} {item.unit}</strong></span>
        <span>Exp: <strong>{formatDateShort(item.expirationDate)}</strong></span>
      </div>

      {item.dateAdded && (
        <div className="item-card__added">
          Added {new Date(item.dateAdded).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      )}

      {item.notes && (
        <div className="item-card__notes">{item.notes}</div>
      )}
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}