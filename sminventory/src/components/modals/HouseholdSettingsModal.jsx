import { useState } from "react";
import { DEFAULT_CATEGORIES, DEFAULT_LOCATIONS } from "../../constants/categories";

export function HouseholdSettingsModal({ household, onSave, onClose }) {
  const [categories, setCategories] = useState(
    household.custom_categories?.length ? household.custom_categories : DEFAULT_CATEGORIES
  );
  const [locations, setLocations] = useState(
    household.custom_locations?.length ? household.custom_locations : DEFAULT_LOCATIONS
  );
  const [newCat, setNewCat] = useState("");
  const [newLoc, setNewLoc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  function addCategory() {
    const val = newCat.trim();
    if (!val) return;
    if (categories.includes(val)) { setNewCat(""); return; }
    setCategories(c => [...c, val]);
    setNewCat("");
  }

  function removeCategory(cat) {
    if (DEFAULT_CATEGORIES.includes(cat)) return; // can't remove defaults
    setCategories(c => c.filter(x => x !== cat));
  }

  function addLocation() {
    const val = newLoc.trim();
    if (!val) return;
    if (locations.includes(val)) { setNewLoc(""); return; }
    setLocations(l => [...l, val]);
    setNewLoc("");
  }

  function removeLocation(loc) {
    if (DEFAULT_LOCATIONS.includes(loc)) return; // can't remove defaults
    setLocations(l => l.filter(x => x !== loc));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave({ custom_categories: categories, custom_locations: locations });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
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
            Default items are locked and cannot be removed.
          </p>

          {error && (
            <div className="auth-error" style={{ marginTop: 8 }}>{error}</div>
          )}

          {/* Categories */}
          <div className="settings-section">
            <div className="settings-section__title">Categories</div>
            <div className="settings-tags">
              {categories.map(cat => (
                <div key={cat} className={`settings-tag ${DEFAULT_CATEGORIES.includes(cat) ? "settings-tag--locked" : ""}`}>
                  <span>{cat}</span>
                  {!DEFAULT_CATEGORIES.includes(cat) && (
                    <button className="settings-tag__remove" onClick={() => removeCategory(cat)} aria-label={`Remove ${cat}`}>
                      &#x2715;
                    </button>
                  )}
                  {DEFAULT_CATEGORIES.includes(cat) && (
                    <span className="settings-tag__lock" title="Default — cannot be removed">&#x1F512;</span>
                  )}
                </div>
              ))}
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
              {locations.map(loc => (
                <div key={loc} className={`settings-tag ${DEFAULT_LOCATIONS.includes(loc) ? "settings-tag--locked" : ""}`}>
                  <span>{loc}</span>
                  {!DEFAULT_LOCATIONS.includes(loc) && (
                    <button className="settings-tag__remove" onClick={() => removeLocation(loc)} aria-label={`Remove ${loc}`}>
                      &#x2715;
                    </button>
                  )}
                  {DEFAULT_LOCATIONS.includes(loc) && (
                    <span className="settings-tag__lock" title="Default — cannot be removed">&#x1F512;</span>
                  )}
                </div>
              ))}
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
        </div>

        <div className="modal__footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}