export function getStatus(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr + "T00:00:00");
  const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { label: "Expired",       key: "expired", days: diff };
  if (diff <= 3) return { label: "Expiring Soon",  key: "warning", days: diff };
  return           { label: "Fresh",           key: "fresh",   days: diff };
}

export const STATUS_BORDER = {
  fresh:   "var(--status-fresh-border)",
  warning: "var(--status-warning-border)",
  expired: "var(--status-expired-border)",
};
