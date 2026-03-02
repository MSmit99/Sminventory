import { useState } from "react";

export function HouseholdPage({ user, onCreate, onJoin, onSignOut }) {
  const [mode,          setMode]          = useState(null); // "create" | "join"
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode,    setInviteCode]    = useState("");
  const [displayName,   setDisplayName]   = useState(
    user?.user_metadata?.display_name || ""
  );
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setError(null);
    if (!householdName) { setError("Household name is required."); return; }
    if (!displayName)   { setError("Your display name is required."); return; }
    setLoading(true);
    try {
      await onCreate(householdName, displayName);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setError(null);
    if (!inviteCode)  { setError("Invite code is required."); return; }
    if (!displayName) { setError("Your display name is required."); return; }
    setLoading(true);
    try {
      await onJoin(inviteCode, displayName);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-logo">
          <div className="auth-logo-mark">S</div>
          <div>
            <div className="auth-app-name">SMInventory</div>
            <div className="auth-app-sub">Family Inventory</div>
          </div>
        </div>

        <h1 className="auth-title">Set up your household</h1>
        <p className="auth-subtitle">
          Create a new household for your family or join one with an invite code.
        </p>

        {error && <div className="auth-error">{error}</div>}

        {/* Display name always shown */}
        <div className="form-field" style={{ marginBottom: 20 }}>
          <label className="form-label">Your Display Name</label>
          <input
            className="input"
            placeholder="e.g. Mom, Dad, Alex"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
        </div>

        {/* Mode selector */}
        {!mode && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="btn-primary" style={{ width: "100%", padding: "14px" }} onClick={() => setMode("create")}>
              Create a New Household
            </button>
            <button className="btn-secondary" style={{ width: "100%", padding: "14px" }} onClick={() => setMode("join")}>
              Join with Invite Code
            </button>
          </div>
        )}

        {/* Create form */}
        {mode === "create" && (
          <div className="auth-form">
            <div className="form-field">
              <label className="form-label">Household Name</label>
              <input
                className="input"
                placeholder="e.g. The Johnson Family"
                value={householdName}
                onChange={e => setHouseholdName(e.target.value)}
              />
            </div>
            <button className="btn-primary auth-submit" onClick={handleCreate} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? "Creating..." : "Create Household"}
            </button>
            <button className="btn-ghost" style={{ width: "100%", textAlign: "center" }} onClick={() => { setMode(null); setError(null); }}>
              Back
            </button>
          </div>
        )}

        {/* Join form */}
        {mode === "join" && (
          <div className="auth-form">
            <div className="form-field">
              <label className="form-label">Invite Code</label>
              <input
                className="input"
                placeholder="8-character code"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                style={{ textTransform: "lowercase", letterSpacing: "0.1em" }}
              />
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Ask a family member for your household invite code.
              </span>
            </div>
            <button className="btn-primary auth-submit" onClick={handleJoin} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? "Joining..." : "Join Household"}
            </button>
            <button className="btn-ghost" style={{ width: "100%", textAlign: "center" }} onClick={() => { setMode(null); setError(null); }}>
              Back
            </button>
          </div>
        )}

        <div className="auth-switch" style={{ marginTop: 24 }}>
          Wrong account? <button className="auth-link" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </div>
  );
}