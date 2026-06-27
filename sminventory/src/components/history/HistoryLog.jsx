import { useState, useEffect, useMemo } from "react";
import { Badge } from "../ui/Badge";
import { useItemHistory } from "../../hooks/useItemHistory";

const FIELD_LABELS = {
  name: "Name",
  quantity: "Quantity",
  unit: "Unit",
  category: "Category",
  location: "Location",
  expiration_date: "Expiration",
  brand: "Brand",
  store_bought_at: "Store",
  notes: "Notes",
  low_stock_threshold: "Low stock alert",
};

const ACTION_META = {
  added:   { label: "Added",   icon: "+", status: "fresh" },
  edited:  { label: "Edited",  icon: "\u270E", status: "warning" },
  removed: { label: "Removed", icon: "\u2715", status: "expired" },
};

const ACTION_FILTERS = ["All", "Added", "Edited", "Removed"];

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

export function HistoryLog({ householdId, members = [] }) {
  const [search,         setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter,   setActionFilter]   = useState("All");
  const [personFilter,   setPersonFilter]   = useState("All"); // "All" or a member's user_id
  const [page,           setPage]           = useState(1);

  // Debounce the search box so we're not firing a query on every keystroke.
  // Resetting to page 1 here too: a new search term landing on, say, page 4
  // of the old results would often show an empty page.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { history, totalCount, totalPages, pageSize, loading } = useItemHistory(householdId, {
    page,
    search: debouncedSearch,
    action: actionFilter,
    personId: personFilter,
  });

  const people = useMemo(
    () => [...members].sort((a, b) => (a.display_name || "").localeCompare(b.display_name || "")),
    [members]
  );

  const hasActiveFilters = search || actionFilter !== "All" || personFilter !== "All";
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd   = Math.min(page * pageSize, totalCount);

  return (
    <div className="history-page">
      <div className="filter-bar">
        <div className="filter-bar__top">
          <div className="search-wrap">
            <span className="search-icon">&#9906;</span>
            <input
              className="input search-input"
              placeholder="Search history by item name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="icon-btn search-clear"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                &#x2715;
              </button>
            )}
          </div>
        </div>

        <div className="filter-bar__row">
          <span className="filter-label">Action</span>
          <div className="chip-row">
            {ACTION_FILTERS.map(a => (
              <button
                key={a}
                className={`chip ${actionFilter === a ? "chip--active" : ""}`}
                onClick={() => { setActionFilter(a); setPage(1); }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {people.length > 0 && (
          <div className="filter-bar__row">
            <span className="filter-label">Person</span>
            <div className="chip-row">
              <button
                className={`chip ${personFilter === "All" ? "chip--active" : ""}`}
                onClick={() => { setPersonFilter("All"); setPage(1); }}
              >
                All
              </button>
              {people.map(p => (
                <button
                  key={p.user_id}
                  className={`chip ${personFilter === p.user_id ? "chip--active" : ""}`}
                  onClick={() => { setPersonFilter(p.user_id); setPage(1); }}
                >
                  {p.display_name || "Someone"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: 200 }}>
          <div className="loading-spinner" />
        </div>
      ) : history.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          {totalCount === 0 && !hasActiveFilters
            ? "No activity yet. Items you add, edit, or remove will show up here."
            : `No matching activity${hasActiveFilters ? " — try adjusting your search or filters" : ""}.`}
        </div>
      ) : (
        <>
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

          <div className="pagination">
            <span className="pagination__summary">
              Showing {rangeStart}{"\u2013"}{rangeEnd} of {totalCount}
            </span>
            <div className="pagination__controls">
              <button
                className="btn-secondary pagination__btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span className="pagination__page">Page {page} of {totalPages}</span>
              <button
                className="btn-secondary pagination__btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}