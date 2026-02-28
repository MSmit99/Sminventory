export function Sidebar({ activeNav, onNav, open, onClose, alertCount, dark, onToggleDark }) {
  const navItems = [
    { id: "inventory", label: "Inventory" },
    { id: "alerts",    label: "Alerts",        badge: alertCount },
    { id: "shopping",  label: "Shopping List" },
    { id: "meals",     label: "Meal Ideas" },
    { id: "history",   label: "History" },
  ];

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="sidebar__logo">
          <div className="sidebar__logo-mark">F</div>
          <div>
            <div className="sidebar__app-name">SMInventory</div>
            <div className="sidebar__app-sub">Family Inventory</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar__nav-item ${activeNav === item.id ? "sidebar__nav-item--active" : ""}`}
              onClick={() => { onNav(item.id); onClose(); }}
            >
              <span className="sidebar__nav-label">{item.label}</span>
              {item.badge > 0 && (
                <span className="sidebar__badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button className="dark-toggle" onClick={onToggleDark} title="Toggle dark mode">
            {dark ? "Light Mode" : "Dark Mode"}
          </button>
          <div className="sidebar__user">
            <div className="sidebar__avatar">J</div>
            <div>
              <div className="sidebar__user-name">Johnson Family</div>
              <div className="sidebar__user-sub">4 members</div>
            </div>
            <button className="icon-btn sidebar__settings" title="Settings">&#9881;</button>
          </div>
        </div>
      </aside>
    </>
  );
}
