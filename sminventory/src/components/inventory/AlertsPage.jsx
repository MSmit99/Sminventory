import { ItemCard } from "../inventory/ItemCard";

function Section({ title, accent, items, onEdit, onDelete, emptyText }) {
  return (
    <div className="alerts-section">
      <div className="alerts-section__header">
        <span className="alerts-section__dot" style={{ background: accent }} />
        <h2 className="alerts-section__title">{title}</h2>
        <span className="alerts-section__count">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="alerts-section__empty">{emptyText}</div>
      ) : (
        <div className="inventory-grid">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              selected={false}
              onSelect={() => {}}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AlertsPage({ expiringItems, lowStockItems, onEdit, onDelete }) {
  return (
    <div className="alerts-page">
      <Section
        title="Expiring & Expired"
        accent="var(--status-warning-border)"
        items={expiringItems}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyText="Nothing expiring soon — you're all caught up."
      />
      <Section
        title="Low Stock"
        accent="var(--status-low-border)"
        items={lowStockItems}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyText="No items below their low-stock threshold."
      />
    </div>
  );
}
