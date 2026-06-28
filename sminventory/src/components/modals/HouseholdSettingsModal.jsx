import { useState, useMemo } from "react";
import { DEFAULT_CATEGORIES, DEFAULT_LOCATIONS } from "../../constants/categories";

function clampDays(v) {
  return Math.min(30, Math.max(1, Number(v) || 3));
}

export function HouseholdSettingsModal({ household, items = [], onSave, onClose }) {
  const [categories, setCategories] = useState(
    household.custom_categories?.length ? household.custom_categories : DEFAULT_CATEGORIES
  );
  const [locations, setLocations] = useState(
    household.custom_locations?.length ? household.custom_locations : DEFAULT_LOCATIONS
  );
  const [alertWindowDays, setAlertWindowDays] = useState(household.alert_window_days ?? 3);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(household.email_alerts_enabled ?? true);
  const [newCat, setNewCat] = useState("");
  const [newLoc, setNewLoc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  // How many current items use each category/location — these can't be
  // removed until reassigned, even if they're not the last one in the list.
  const categoryUsage = useMemo(() => {
    const counts = {};
    for (const i of items) counts[i.category] = (counts[i.category] || 0) + 1;
    return counts;
  }, [items]);

  const locationUsage = useMemo(() => {
    const counts = {};
    for (const i of items) counts[i.location] = (counts[i.location] || 0) + 1;
    return counts;
  }, [items]);

  // Everything in this modal autosaves the moment you change it — no
  // separate "Save" button. `partial` overrides just the field that
  // changed; the rest come from current state, which is correct since
  // those other fields weren't touched in this call.
  async function persist(partial) {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        custom_categories:    partial.custom_categories    ?? categories,
        custom_locations:     partial.custom_locations     ?? locations,
        alert_window_days:    partial.alert_window_days    ?? clampDays(alertWindowDays),
        email_alerts_enabled: partial.email_alerts_enabled ?? emailAlertsEnabled,
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function addCategory() {
    const val = newCat.trim();
    if (!val || categories.includes(val)) { setNewCat(""); return; }
    const prev = categories;
    const updated = [...categories, val];
    setCategories(updated);
    setNewCat("");
    setError(null);
    try {
      await persist({ custom_categories: updated });
    } catch (err) {
      setCategories(prev);
      setError(err.message);
    }
  }

  async function removeCategory(cat) {
    if (categories.length <= 1) return;   // must always keep at least one category
    if (categoryUsage[cat]) return;       // can't remove a category currently in use
    const prev = categories;
    const updated = categories.filter(x => x !== cat);
    setCategories(updated);
    setError(null);
    try {
      await persist({ custom_categories: updated });
    } catch (err) {
      setCategories(prev);
      setError(err.message);
    }
  }

  async function addLocation() {
    const val = newLoc.trim();
    if (!val || locations.includes(val)) { setNewLoc(""); return; }
    const prev = locations;
    const updated = [...locations, val];
    setLocations(updated);
    setNewLoc("");
    setError(null);
    try {
      await persist({ custom_locations: updated });
    } catch (err) {
      setLocations(prev);
      setError(err.message);
    }
  }

  async function removeLocation(loc) {
    if (locations.length <= 1) return;    // must always keep at least one location
    if (locationUsage[loc]) return;       // can't remove a location currently in use
    const prev = locations;
    const updated = locations.filter(x => x !== loc);
    setLocations(updated);
    setError(null);
    try {
      await persist({ custom_locations: updated });
    } catch (err) {
      setLocations(prev);
      setError(err.message);
    }
  }

  async function handleAlertWindowBlur() {
    const clamped = clampDays(alertWindowDays);
    setAlertWindowDays(clamped);
    const prev = household.alert_window_days ?? 3;
    if (clamped === prev) return; // nothing actually changed
    setError(null);
    try {
      await persist({ alert_window_days: clamped });
    } catch (err) {
      setAlertWindowDays(prev);
      setError(err.message);
    }
  }

  async function handleEmailAlertsToggle(checked) {
    const prev = emailAlertsEnabled;
    setEmailAlertsEnabled(checked);
    setError(null);
    try {
      await persist({ email_alerts_enabled: checked });
    } catch (err) {
      setEmailAlertsEnabled(prev);
      setError(err.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal__header">
          <h2 className="modal__title">Household Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>

        <div className="modal__body">
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
            Customize the categories and locations available to your household.
            At least one of each must remain, and any currently used by an item locks automatically.
            Changes save automatically{saving ? " — saving..." : "."}
          </p>

          {error && (
            <div className="auth-error" style={{ marginTop: 8 }}>{error}</div>
          )}

          {/* Categories */}
          <div className="settings-section">
            <div className="settings-section__title">Categories</div>
            <div className="settings-tags">
              {categories.map(cat => {
                const inUseCount = categoryUsage[cat] || 0;
                const isLastOne  = categories.length === 1;
                const locked     = isLastOne || inUseCount > 0;
                const lockReason = isLastOne
                  ? "At least one category is required"
                  : `In use by ${inUseCount} item${inUseCount === 1 ? "" : "s"} — reassign them first to remove this`;
                return (
                  <div key={cat} className={`settings-tag ${locked ? "settings-tag--locked" : ""}`}>
                    <span>{cat}</span>
                    {locked ? (
                      <span className="settings-tag__lock" title={lockReason}>&#x1F512;</span>
                    ) : (
                      <button className="settings-tag__remove" onClick={() => removeCategory(cat)} aria-label={`Remove ${cat}`}>
                        &#x2715;
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="settings-add-row">
              <input
                className="input"
                placeholder="Add a category..."
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCategory()}
                style={{ flex: 1 }}
              />
              <button className="btn-secondary" onClick={addCategory} style={{ whiteSpace: "nowrap" }}>
                Add
              </button>
            </div>
          </div>

          {/* Locations */}
          <div className="settings-section">
            <div className="settings-section__title">Locations</div>
            <div className="settings-tags">
              {locations.map(loc => {
                const inUseCount = locationUsage[loc] || 0;
                const isLastOne  = locations.length === 1;
                const locked     = isLastOne || inUseCount > 0;
                const lockReason = isLastOne
                  ? "At least one location is required"
                  : `In use by ${inUseCount} item${inUseCount === 1 ? "" : "s"} — reassign them first to remove this`;
                return (
                  <div key={loc} className={`settings-tag ${locked ? "settings-tag--locked" : ""}`}>
                    <span>{loc}</span>
                    {locked ? (
                      <span className="settings-tag__lock" title={lockReason}>&#x1F512;</span>
                    ) : (
                      <button className="settings-tag__remove" onClick={() => removeLocation(loc)} aria-label={`Remove ${loc}`}>
                        &#x2715;
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="settings-add-row">
              <input
                className="input"
                placeholder="Add a location..."
                value={newLoc}
                onChange={e => setNewLoc(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addLocation()}
                style={{ flex: 1 }}
              />
              <button className="btn-secondary" onClick={addLocation} style={{ whiteSpace: "nowrap" }}>
                Add
              </button>
            </div>
          </div>

          {/* Alerts */}
          <div className="settings-section">
            <div className="settings-section__title">Alerts</div>

            <div className="settings-toggle-row">
              <div>
                <div className="settings-toggle-row__label">Expiring-soon window</div>
                <div className="settings-toggle-row__hint">Flag items expiring within this many days</div>
              </div>
              <input
                className="input settings-number-input"
                type="number"
                min="1"
                max="30"
                value={alertWindowDays}
                onChange={e => setAlertWindowDays(e.target.value)}
                onBlur={handleAlertWindowBlur}
              />
            </div>

            <div className="settings-toggle-row">
              <div>
                <div className="settings-toggle-row__label">Email alerts</div>
                <div className="settings-toggle-row__hint">Send a daily digest of expiring &amp; low-stock items to all members</div>
              </div>
              <input
                type="checkbox"
                className="checkbox"
                checked={emailAlertsEnabled}
                onChange={e => handleEmailAlertsToggle(e.target.checked)}
              />
            </div>

            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
              Browser notifications are turned on per-device from the alert banner on the Inventory page,
              and low-stock alerts only fire for items with a "Low Stock Alert" threshold set.
            </p>
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}