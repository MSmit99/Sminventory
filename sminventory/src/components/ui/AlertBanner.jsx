import { useState } from "react";

function BannerGroup({ variant, icon, title, items, onDismiss }) {
  if (!items.length) return null;
  const preview = items.slice(0, 3).map(i => i.name).join(", ");
  const extra   = items.length > 3 ? ` +${items.length - 3} more` : "";

  return (
    <div className={`alert-banner ${variant === "low" ? "alert-banner--low" : ""}`}>
      <div className="alert-banner__icon">{icon}</div>
      <div className="alert-banner__body">
        <div className="alert-banner__title">{title}</div>
        <div className="alert-banner__desc">{preview}{extra}</div>
      </div>
      <button className="icon-btn" onClick={onDismiss} aria-label="Dismiss">&#x2715;</button>
    </div>
  );
}

/**
 * Shows expiring-soon/expired items and low-stock items as separate
 * dismissible banners. Optionally surfaces a one-tap prompt to enable
 * browser notifications if the user hasn't granted/denied permission yet.
 */
export function AlertBanner({ items = [], lowStockItems = [], notificationPermission, onRequestNotifications }) {
  const [dismissedExpiring, setDismissedExpiring] = useState(false);
  const [dismissedLow,      setDismissedLow]      = useState(false);

  const showExpiring = !dismissedExpiring && items.length > 0;
  const showLow       = !dismissedLow && lowStockItems.length > 0;
  const showNotifyPrompt = (showExpiring || showLow) && notificationPermission === "default";

  if (!showExpiring && !showLow) return null;

  return (
    <div className="alert-banner-stack">
      {showExpiring && (
        <BannerGroup
          variant="expiring"
          icon="!"
          title={`${items.length} item${items.length > 1 ? "s" : ""} expiring or expired`}
          items={items}
          onDismiss={() => setDismissedExpiring(true)}
        />
      )}
      {showLow && (
        <BannerGroup
          variant="low"
          icon="↓"
          title={`${lowStockItems.length} item${lowStockItems.length > 1 ? "s" : ""} running low`}
          items={lowStockItems}
          onDismiss={() => setDismissedLow(true)}
        />
      )}
      {showNotifyPrompt && (
        <div className="alert-banner" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border-strong)" }}>
          <div className="alert-banner__icon" style={{ background: "var(--accent)" }}>&#128276;</div>
          <div className="alert-banner__body">
            <div className="alert-banner__title" style={{ color: "var(--text-primary)" }}>Get notified in your browser</div>
            <div className="alert-banner__desc" style={{ color: "var(--text-muted)" }}>
              Turn on notifications so you don't miss expiring or low-stock items.
            </div>
          </div>
          <button className="alert-banner__notify-btn" style={{ color: "var(--accent)" }} onClick={onRequestNotifications}>
            Enable
          </button>
        </div>
      )}
    </div>
  );
}
