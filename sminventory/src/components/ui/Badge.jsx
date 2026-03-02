export function Badge({ status, children }) {
  const cls = {
    fresh:   "badge badge--fresh",
    warning: "badge badge--warning",
    expired: "badge badge--expired",
    neutral: "badge badge--neutral",
  }[status] || "badge badge--neutral";

  return <span className={cls}>{children}</span>;
}
