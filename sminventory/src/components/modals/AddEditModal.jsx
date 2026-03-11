import { UNITS } from "../../constants/categories";

export function AddEditModal({ mode, form, onChange, onSave, onClose, categories = [], locations = [] }) {
  const quantity = form.quantity;
  const hasValidQuantity =
    quantity !== "" &&
    quantity !== null &&
    quantity !== undefined &&
    !Number.isNaN(Number(quantity));
  const isValid = !!form.name && !!form.expirationDate && hasValidQuantity;

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleBackdrop}>
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">{mode === "add" ? "Add Item" : "Edit Item"}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">&#x2715;</button>
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
            <label className="form-label">Brand <span className="form-label--optional">(optional)</span></label>
            <input className="input" placeholder="e.g. Horizon Organic" value={form.brand} onChange={e => onChange("brand", e.target.value)} />
          </div>

          <div className="form-field">
            <label className="form-label">Notes <span className="form-label--optional">(optional)</span></label>
            <input className="input" placeholder="e.g. Opened, for Thursday dinner..." value={form.notes} onChange={e => onChange("notes", e.target.value)} />
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onSave} disabled={!isValid} style={{ opacity: isValid ? 1 : 0.45 }}>
            {mode === "add" ? "Add Item" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}