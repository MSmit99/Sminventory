import { Badge } from "../ui/Badge";
import { getStatus } from "../../utils/statusUtils";
import { formatDate } from "../../utils/dateUtils";

export function ItemRow({ item, selected, onSelect, onEdit, onDelete, isLast }) {
  const status = getStatus(item.expirationDate);

  return (
    <tr className={`table-row ${selected ? "table-row--selected" : ""} ${isLast ? "" : "table-row--bordered"}`}>
      <td className="table-cell table-cell--check">
        <input
          type="checkbox"
          className="checkbox"
          checked={selected}
          onChange={() => onSelect(item.id)}
        />
      </td>
      <td className="table-cell">
        <div className="table-item-name">{item.name}</div>
        {item.brand && <div className="table-item-brand">{item.brand}</div>}
      </td>
      <td className="table-cell table-cell--secondary">{item.category}</td>
      <td className="table-cell table-cell--secondary">{item.location}</td>
      <td className="table-cell table-cell--secondary">{item.quantity} {item.unit}</td>
      <td className="table-cell table-cell--secondary">{formatDate(item.expirationDate)}</td>
      <td className="table-cell">
        <Badge status={status.key}>{status.label}</Badge>
      </td>
      <td className="table-cell">
        <div className="table-row-actions">
          <button className="icon-btn" onClick={() => onEdit(item)} title="Edit" aria-label="Edit item">
            <EditIcon />
          </button>
          <button className="icon-btn icon-btn--danger" onClick={() => onDelete(item)} title="Delete" aria-label="Delete item">
            <TrashIcon />
          </button>
        </div>
      </td>
    </tr>
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
