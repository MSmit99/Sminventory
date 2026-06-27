import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sminventory_notified_alerts";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadNotifiedToday(householdId) {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const bucket = raw[householdId];
    if (!bucket || bucket.day !== todayKey()) return new Set();
    return new Set(bucket.ids);
  } catch {
    return new Set();
  }
}

function saveNotifiedToday(householdId, idSet) {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    raw[householdId] = { day: todayKey(), ids: [...idSet] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  } catch {
    // localStorage unavailable (private browsing, etc.) — fail silently
  }
}

/**
 * Fires a browser notification (once per item per day) for items that just
 * became expiring/expired or low stock. Falls back gracefully if the
 * Notification API isn't supported or permission is denied.
 */
export function useNotifications(householdId, expiringItems, lowStockItems) {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState(supported ? Notification.permission : "unsupported");

  const requestPermission = useCallback(async () => {
    if (!supported) return "unsupported";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [supported]);

  useEffect(() => {
    if (!supported || permission !== "granted" || !householdId) return;

    const notifiedToday = loadNotifiedToday(householdId);
    const newExpiring = expiringItems.filter(i => !notifiedToday.has(`exp:${i.id}`));
    const newLow       = lowStockItems.filter(i => !notifiedToday.has(`low:${i.id}`));

    if (newExpiring.length === 0 && newLow.length === 0) return;

    if (newExpiring.length > 0) {
      const names = newExpiring.slice(0, 3).map(i => i.name).join(", ");
      new Notification("SMInventory — Expiring items", {
        body: newExpiring.length === 1
          ? `${names} needs attention.`
          : `${names}${newExpiring.length > 3 ? ` +${newExpiring.length - 3} more` : ""} need attention.`,
        tag: `sminventory-expiring-${householdId}`,
      });
    }

    if (newLow.length > 0) {
      const names = newLow.slice(0, 3).map(i => i.name).join(", ");
      new Notification("SMInventory — Low stock", {
        body: newLow.length === 1
          ? `${names} is running low.`
          : `${names}${newLow.length > 3 ? ` +${newLow.length - 3} more` : ""} are running low.`,
        tag: `sminventory-lowstock-${householdId}`,
      });
    }

    newExpiring.forEach(i => notifiedToday.add(`exp:${i.id}`));
    newLow.forEach(i => notifiedToday.add(`low:${i.id}`));
    saveNotifiedToday(householdId, notifiedToday);
    // Only re-run when the alert lists actually change in length/content,
    // not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, permission, supported, JSON.stringify(expiringItems.map(i => i.id)), JSON.stringify(lowStockItems.map(i => i.id))]);

  return { supported, permission, requestPermission };
}
