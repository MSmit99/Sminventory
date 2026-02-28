import { ItemRow } from "./ItemRow";

const HEADERS = ["Item", "Category", "Location", "Qty", "Expires", "Status", ""];

export function InventoryList({ items, selected, onSelectAll, onClearAll, onSelect, onEdit, onDelete }) {
  const allSelected = items.length > 0 && items.every(i => selected.has(i.id));

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">No items found</div>
        <div className="empty-state__sub">Try adjusting your search or filters</div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr className="table-head-row">
            <th className="table-th table-th--check">
              <input
                type="checkbox"
                className="checkbox"
                checked={allSelected}
                onChange={e => e.target.checked ? onSelectAll() : onClearAll()}
              />
            </th>
            {HEADERS.map(h => (
              <th key={h} className="table-th">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <ItemRow
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              isLast={idx === items.length - 1}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
