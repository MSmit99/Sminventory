import { useState } from "react";

export function Sidebar({ activeNav, onNav, open, onClose, alertCount, dark, onToggleDark, household, members, user, onSignOut }) {
  const [copied, setCopied] = useState(false);

  const navItems = [
    { id: "inventory", label: "Inventory" },
    { id: "alerts",    label: "Alerts",        badge: alertCount },
    { id: "shopping",  label: "Shopping List" },
    { id: "meals",     label: "Meal Ideas" },
    { id: "history",   label: "History" },
  ];

  function copyInviteCode() {
    if (!household?.invite_code) return;
    navigator.clipboard.writeText(household.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayName = members.find(m => m.user_id === user?.id)?.display_name || user?.email || "You";

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>

      {/* Logo */}
      <div className="sidebar__logo">
        <img src="/smiv.jpg" alt="SMInventory" className="sidebar__logo-mark" style={{ borderRadius: 10, objectFit: "cover" }} />
        <div>
          <div className="sidebar__app-name">SMInventory</div>
          <div className="sidebar__app-sub">{household?.name || "Family Inventory"}</div>
        </div>
      </div>

        {/* Invite code */}
        {household?.invite_code && (
          <div className="sidebar__invite">
            <div className="sidebar__invite-label">Invite Code</div>
            <button className="sidebar__invite-code" onClick={copyInviteCode} title="Click to copy">
              <span>{household.invite_code}</span>
              <span className="sidebar__invite-copy">{copied ? "Copied!" : "Copy"}</span>
            </button>
            <div className="sidebar__invite-hint">Share this code with family members</div>
          </div>
        )}

        {/* Nav */}
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

        {/* Footer */}
        <div className="sidebar__footer">
          <button className="dark-toggle" onClick={onToggleDark}>
            {dark ? "Light Mode" : "Dark Mode"}
          </button>
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="sidebar__user-name">{displayName}</div>
              <div className="sidebar__user-sub">{members.length} member{members.length !== 1 ? "s" : ""}</div>
            </div>
            <button
              type="button"
              className="icon-btn sidebar__settings"
              onClick={onSignOut}
              title="Sign out"
              aria-label="Sign out"
            >
              &#x2715;
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}