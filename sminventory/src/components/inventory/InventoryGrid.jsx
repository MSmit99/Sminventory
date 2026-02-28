import { ItemCard } from "./ItemCard";

export function InventoryGrid({ items, selected, onSelect, onEdit, onDelete }) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">No items found</div>
        <div className="empty-state__sub">Try adjusting your search or filters</div>
      </div>
    );
  }

  return (
    <div className="inventory-grid">
      {items.map(item => (
        <ItemCard
          key={item.id}
          item={item}
          selected={selected.has(item.id)}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
