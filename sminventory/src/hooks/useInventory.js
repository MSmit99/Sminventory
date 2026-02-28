import { useState, useMemo } from "react";
import { MOCK_ITEMS } from "../constants/mockData";
import { getStatus } from "../utils/statusUtils";

export function useInventory() {
  const [items, setItems] = useState(MOCK_ITEMS);

  const stats = useMemo(() => ({
    total:        items.length,
    fresh:        items.filter(i => getStatus(i.expirationDate).key === "fresh").length,
    expiringSoon: items.filter(i => getStatus(i.expirationDate).key === "warning").length,
    expired:      items.filter(i => getStatus(i.expirationDate).key === "expired").length,
  }), [items]);

  const expiringItems = useMemo(
    () => items.filter(i => ["warning", "expired"].includes(getStatus(i.expirationDate).key)),
    [items]
  );

  function addItem(form) {
    setItems(prev => [
      ...prev,
      { ...form, id: Date.now(), quantity: parseFloat(form.quantity), addedBy: "You", dateAdded: new Date().toISOString() },
    ]);
  }

  function updateItem(id, form) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...form, quantity: parseFloat(form.quantity) } : i));
  }

  function deleteItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function deleteItems(ids) {
    setItems(prev => prev.filter(i => !ids.has(i.id)));
  }

  return { items, stats, expiringItems, addItem, updateItem, deleteItem, deleteItems };
}
