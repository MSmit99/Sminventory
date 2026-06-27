import { useState } from "react";

export function UserSettingsModal({ user, displayName, onUpdateDisplayName, onUpdateEmail, onUpdatePassword, onClose }) {
  const [name,            setName]            = useState(displayName || "");
  const [email,           setEmail]           = useState(user?.email || "");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingName,     setSavingName]     = useState(false);
  const [savingEmail,    setSavingEmail]    = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [nameError,     setNameError]     = useState(null);
  const [emailError,    setEmailError]    = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  const [nameSaved,     setNameSaved]     = useState(false);
  const [emailSaved,    setEmailSaved]    = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  async function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed) { setNameError("Display name can't be empty."); return; }
    setSavingName(true);
    setNameError(null);
    setNameSaved(false);
    try {
      await onUpdateDisplayName(trimmed);
      setNameSaved(true);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingName(false);
    }
  }

  async function handleSaveEmail() {
    const trimmed = email.trim();
    if (!trimmed || trimmed === user?.email) return;
    setSavingEmail(true);
    setEmailError(null);
    setEmailSaved(false);
    try {
      await onUpdateEmail(trimmed);
      setEmailSaved(true);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleSavePassword() {
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords don't match."); return; }
    setSavingPassword(true);
    try {
      await onUpdatePassword(newPassword);
      setPasswordSaved(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal__header">
          <h2 className="modal__title">User Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>

        <div className="modal__body">
          {/* Display name */}
          <div className="settings-section">
            <div className="settings-section__title">Display Name</div>
            <div className="settings-add-row">
              <input
                className="input"
                value={name}
                onChange={e => { setName(e.target.value); setNameSaved(false); }}
                style={{ flex: 1 }}
              />
              <button
                className="btn-secondary"
                onClick={handleSaveName}
                disabled={savingName || !name.trim() || name.trim() === displayName}
                style={{ whiteSpace: "nowrap" }}
              >
                {savingName ? "Saving..." : "Save"}
              </button>
            </div>
            {nameError && <div className="auth-error" style={{ marginTop: 8 }}>{nameError}</div>}
            {nameSaved && (
              <p style={{ fontSize: 11, color: "var(--status-fresh-text)", margin: "6px 0 0" }}>Display name updated.</p>
            )}
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>
              This is the name other household members see on items you add, edit, or remove.
            </p>
          </div>

          {/* Email */}
          <div className="settings-section">
            <div className="settings-section__title">Email</div>
            <div className="settings-add-row">
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailSaved(false); }}
                style={{ flex: 1 }}
              />
              <button
                className="btn-secondary"
                onClick={handleSaveEmail}
                disabled={savingEmail || !email.trim() || email.trim() === user?.email}
                style={{ whiteSpace: "nowrap" }}
              >
                {savingEmail ? "Saving..." : "Save"}
              </button>
            </div>
            {emailError && <div className="auth-error" style={{ marginTop: 8 }}>{emailError}</div>}
            {emailSaved && (
              <p style={{ fontSize: 11, color: "var(--status-fresh-text)", margin: "6px 0 0" }}>
                Confirmation email sent — check your inbox to finish the change.
              </p>
            )}
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>
              Changing your email requires confirming it via a link we send you. Your email stays the same until you confirm.
            </p>
          </div>

          {/* Password */}
          <div className="settings-section">
            <div className="settings-section__title">Password</div>
            <div className="form-field">
              <label className="form-label">New Password</label>
              <input
                className="input"
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPasswordSaved(false); }}
              />
            </div>
            <div className="form-field" style={{ marginTop: 10 }}>
              <label className="form-label">Confirm New Password</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPasswordSaved(false); }}
              />
            </div>
            {passwordError && <div className="auth-error" style={{ marginTop: 8 }}>{passwordError}</div>}
            {passwordSaved && (
              <p style={{ fontSize: 11, color: "var(--status-fresh-text)", margin: "6px 0 0" }}>Password updated.</p>
            )}
            <button
              className="btn-secondary"
              onClick={handleSavePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
              style={{ marginTop: 10 }}
            >
              {savingPassword ? "Saving..." : "Update Password"}
            </button>
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}