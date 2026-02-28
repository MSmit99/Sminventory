export function DeleteModal({ itemName, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--sm">
        <div className="modal__header">
          <h2 className="modal__title">Delete Item</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>
        <div className="modal__body modal__body--centered">
          <p className="modal__confirm-text">
            This will permanently remove <strong>{itemName}</strong> from your inventory.
          </p>
        </div>
        <div className="modal__footer modal__footer--centered">
          <button className="btn-secondary" onClick={onClose}>Keep It</button>
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
