const NAV_TITLES = {
  inventory: "Inventory",
  alerts:    "Alerts",
  shopping:  "Shopping List",
  meals:     "Meal Ideas",
  history:   "History",
};

export function Header({ activeNav, onMenuOpen, onAddItem }) {
  const title = NAV_TITLES[activeNav] || "Inventory";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <header className="header">
      <button className="icon-btn header__menu" onClick={onMenuOpen} aria-label="Open menu">
        <HamburgerIcon />
      </button>
      <div className="header__title-wrap">
        <h1 className="header__title">{title}</h1>
        <p className="header__date">{today}</p>
      </div>
      <button className="btn-primary" onClick={onAddItem}>+ Add Item</button>
    </header>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <rect y="3"  width="20" height="2.5" rx="1.25" />
      <rect y="9"  width="20" height="2.5" rx="1.25" />
      <rect y="15" width="20" height="2.5" rx="1.25" />
    </svg>
  );
}
