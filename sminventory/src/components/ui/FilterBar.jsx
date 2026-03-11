export function FilterBar({
  search, onSearch,
  filterCategory, onCategory,
  filterLocation, onLocation,
  filterStatus, onStatus,
  sortBy, onSort,
  view, onView,
  categories = [],
  locations  = [],
}) {
  return (
    <div className="filter-bar">
      {/* Search + Sort + View toggle */}
      <div className="filter-bar__top">
        <div className="search-wrap">
          <span className="search-icon">&#9906;</span>
          <input
            className="input search-input"
            placeholder="Search items or brands..."
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="icon-btn search-clear"
              aria-label="Clear search"
              onClick={() => onSearch("")}
            >
              &#x2715;
            </button>
          )}
        </div>

        <select className="input select-sm" value={sortBy} onChange={e => onSort(e.target.value)}>
          <option value="expiration">Sort: Expiration</option>
          <option value="name">Sort: Name</option>
          <option value="dateAdded">Sort: Date Added</option>
        </select>

        <div className="view-toggle">
          <button className={`view-btn ${view === "grid" ? "view-btn--active" : ""}`} onClick={() => onView("grid")} aria-label="Grid view">
            <GridIcon />
          </button>
          <button className={`view-btn ${view === "list" ? "view-btn--active" : ""}`} onClick={() => onView("list")} aria-label="List view">
            <ListIcon />
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div className="filter-bar__row">
        <span className="filter-label">Category</span>
        <div className="chip-row">
          <button className={`chip ${filterCategory === "All" ? "chip--active" : ""}`} onClick={() => onCategory("All")}>All</button>
          {categories.map(c => (
            <button key={c} className={`chip ${filterCategory === c ? "chip--active" : ""}`} onClick={() => onCategory(c)}>{c}</button>
          ))}
        </div>
      </div>

      {/* Location + Status chips */}
      <div className="filter-bar__row">
        <span className="filter-label">Location</span>
        <div className="chip-row">
          <button className={`chip ${filterLocation === "All" ? "chip--active" : ""}`} onClick={() => onLocation("All")}>All</button>
          {locations.map(l => (
            <button key={l} className={`chip ${filterLocation === l ? "chip--active" : ""}`} onClick={() => onLocation(l)}>{l}</button>
          ))}
        </div>
        <span className="filter-label" style={{ marginLeft: 16 }}>Status</span>
        <div className="chip-row">
          {["All", "Fresh", "Warning", "Expired"].map(s => (
            <button key={s} className={`chip ${filterStatus === s ? "chip--active" : ""}`} onClick={() => onStatus(s)}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="0" y="0" width="7" height="7" rx="1" />
      <rect x="9" y="0" width="7" height="7" rx="1" />
      <rect x="0" y="9" width="7" height="7" rx="1" />
      <rect x="9" y="9" width="7" height="7" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="0" y="1" width="16" height="2.5" rx="1" />
      <rect x="0" y="6.5" width="16" height="2.5" rx="1" />
      <rect x="0" y="12" width="16" height="2.5" rx="1" />
    </svg>
  );
}