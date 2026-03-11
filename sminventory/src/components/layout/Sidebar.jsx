import { useState } from "react";

export function Sidebar({ activeNav, onNav, open, onClose, alertCount, dark, onToggleDark, household, members, user, onSignOut, onOpenSettings }) {
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

          <button className="sidebar__settings-btn" onClick={() => { onOpenSettings(); onClose(); }}>
            <SettingsIcon />
            Household Settings
          </button>

          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar__user-name">{displayName}</div>
              <div className="sidebar__user-sub">{members.length} member{members.length !== 1 ? "s" : ""}</div>
            </div>
          </div>

          <button type="button" className="sidebar__signout-btn" onClick={onSignOut}>
            <SignOutIcon />
            Sign Out
          </button>
        </div>

      </aside>
    </>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}