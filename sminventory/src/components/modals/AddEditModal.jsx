import { useState } from "react";
import { UNITS } from "../../constants/categories";

export function AddEditModal({ mode, form, onChange, onSave, onClose, categories = [], locations = [] }) {
  // Snapshot of the form as it was the moment this modal opened — used
  // to detect unsaved changes. useState's initial value is only used on
  // the first render, so this never changes after mount; each open of
  // the modal is a fresh component instance anyway.
  const [initialForm] = useState(form);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const quantity = form.quantity;
  const hasValidQuantity =
    quantity !== "" &&
    quantity !== null &&
    quantity !== undefined &&
    !Number.isNaN(Number(quantity));
  const isValid = !!form.name && !!form.expirationDate && hasValidQuantity;

  function requestClose() {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) requestClose();
  }

  return (
    <div className="modal-overlay" onClick={handleBackdrop}>
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">{mode === "add" ? "Add Item" : "Edit Item"}</h2>
          <button className="icon-btn" onClick={requestClose} aria-label="Close">&#x2715;</button>
        </div>

        <div className="modal__body">
          <div className="form-field">
            <label className="form-label">Item Name <span className="required">*</span></label>
            <input className="input" placeholder="e.g. Whole Milk" value={form.name} onChange={e => onChange("name", e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Category <span className="required">*</span></label>
              <select className="input" value={form.category} onChange={e => onChange("category", e.target.value)}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Location <span className="required">*</span></label>
              <select className="input" value={form.location} onChange={e => onChange("location", e.target.value)}>
                {locations.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Quantity <span className="required">*</span></label>
              <input className="input" type="number" min="0" step="0.1" placeholder="0" value={form.quantity} onChange={e => onChange("quantity", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Unit</label>
              <select className="input" value={form.unit} onChange={e => onChange("unit", e.target.value)}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Expiration Date <span className="required">*</span></label>
            <input className="input" type="date" value={form.expirationDate} onChange={e => onChange("expirationDate", e.target.value)} />
          </div>

          <div className="form-field">
            <label className="form-label">Low Stock Alert Threshold <span className="form-label--optional">(optional)</span></label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 2 — leave blank to disable"
              value={form.lowStockThreshold ?? ""}
              onChange={e => onChange("lowStockThreshold", e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Brand <span className="form-label--optional">(optional)</span></label>
            <input className="input" placeholder="e.g. Horizon Organic" value={form.brand} onChange={e => onChange("brand", e.target.value)} />
          </div>

          <div className="form-field">
            <label className="form-label">Store Bought At <span className="form-label--optional">(optional)</span></label>
            <input className="input" placeholder="e.g. Costco" value={form.storeBoughtAt} onChange={e => onChange("storeBoughtAt", e.target.value)} />
          </div>

          <div className="form-field">
            <label className="form-label">Notes <span className="form-label--optional">(optional)</span></label>
            <input className="input" placeholder="e.g. Opened, for Thursday dinner..." value={form.notes} onChange={e => onChange("notes", e.target.value)} />
          </div>
        </div>

        {showUnsavedWarning ? (
          <div className="modal__footer" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--status-warning-text)", margin: 0, fontWeight: 600 }}>
              You have unsaved changes. Discard them?
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setShowUnsavedWarning(false)}>Keep Editing</button>
              <button className="btn-danger" onClick={onClose}>Discard Changes</button>
            </div>
          </div>
        ) : (
          <div className="modal__footer">
            <button className="btn-secondary" onClick={requestClose}>Cancel</button>
            <button className="btn-primary" onClick={onSave} disabled={!isValid} style={{ opacity: isValid ? 1 : 0.45 }}>
              {mode === "add" ? "Add Item" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}