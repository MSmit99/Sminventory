import { Badge } from "../ui/Badge";

const FIELD_LABELS = {
  name: "Name",
  quantity: "Quantity",
  unit: "Unit",
  category: "Category",
  location: "Location",
  expiration_date: "Expiration",
  brand: "Brand",
  notes: "Notes",
  low_stock_threshold: "Low stock alert",
};

const ACTION_META = {
  added:   { label: "Added",   icon: "+", status: "fresh" },
  edited:  { label: "Edited",  icon: "\u270E", status: "warning" },
  removed: { label: "Removed", icon: "\u2715", status: "expired" },
};

function formatValue(field, value) {
  if (value === null || value === undefined || value === "") return "\u2014";
  if (field === "expiration_date") {
    return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }
  return String(value);
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function HistoryLog({ history, loading }) {
  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: 200 }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
        No activity yet. Items you add, edit, or remove will show up here.
      </div>
    );
  }

  return (
    <div className="history-log">
      {history.map(entry => {
        const meta = ACTION_META[entry.action] || ACTION_META.edited;
        const changeKeys = entry.changes ? Object.keys(entry.changes) : [];

        return (
          <div key={entry.id} className="history-entry">
            <div className={`history-entry__icon history-entry__icon--${entry.action}`}>{meta.icon}</div>
            <div className="history-entry__body">
              <div className="history-entry__line">
                <strong>{entry.item_name}</strong>
                <Badge status={meta.status}>{meta.label}</Badge>
              </div>

              {changeKeys.length > 0 && (
                <ul className="history-entry__changes">
                  {changeKeys.map(key => (
                    <li key={key}>
                      {FIELD_LABELS[key] || key}: {formatValue(key, entry.changes[key].from)} {"\u2192"} {formatValue(key, entry.changes[key].to)}
                    </li>
                  ))}
                </ul>
              )}

              <div className="history-entry__meta">
                {entry.changed_by_name || "Someone"} · {timeAgo(entry.created_at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
