const DEFAULT_WINDOW_DAYS = 3;

export function getStatus(dateStr, windowDays = DEFAULT_WINDOW_DAYS) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr + "T00:00:00");
  const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)          return { label: "Expired",       key: "expired", days: diff };
  if (diff <= windowDays) return { label: "Expiring Soon", key: "warning", days: diff };
  return                   { label: "Fresh",             key: "fresh",   days: diff };
}

export const STATUS_BORDER = {
  fresh:   "var(--status-fresh-border)",
  warning: "var(--status-warning-border)",
  expired: "var(--status-expired-border)",
};

// An item is "low stock" if it has a threshold set and its current quantity
// has dropped to or below that threshold. Items without a threshold are
// never flagged — the household has to opt in per item.
export function isLowStock(item) {
  const threshold = item.lowStockThreshold ?? item.low_stock_threshold;
  if (threshold === null || threshold === undefined || threshold === "") return false;
  const t = Number(threshold);
  if (Number.isNaN(t)) return false;
  return Number(item.quantity) <= t;
}
