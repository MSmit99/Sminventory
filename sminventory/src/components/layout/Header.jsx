const NAV_TITLES = {
  inventory: "Inventory",
  alerts:    "Alerts",
  shopping:  "Shopping List",
  meals:     "Meal Ideas",
  history:   "History",
};

export function Header({ activeNav, onAddItem }) {
  const title = NAV_TITLES[activeNav] || "Inventory";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <header className="header">
      <div className="header__title-wrap">
        <h1 className="header__title">{title}</h1>
        <p className="header__date">{today}</p>
      </div>
      <button className="btn-primary" onClick={onAddItem}>+ Add Item</button>
    </header>
  );
}
