import { useState } from "react";

export function AuthPage({ onSignIn, onSignUp }) {
  const [mode,        setMode]        = useState("login"); // "login" | "register"
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(null);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    if (!email || !password) { setError("Email and password are required."); return; }
    if (mode === "register" && !displayName) { setError("Display name is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password, displayName);
        setSuccess("Account created! Check your email to confirm, then log in.");
        setMode("login");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">S</div>
          <div>
            <div className="auth-app-name">SMInventory</div>
            <div className="auth-app-sub">Family Inventory</div>
          </div>
        </div>

        <h1 className="auth-title">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Sign in to access your family inventory."
            : "Sign up to get started with your family inventory."}
        </p>

        {error && (
          <div className="auth-error">{error}</div>
        )}

        {success && (
          <div className="auth-success">{success}</div>
        )}

        <div className="auth-form">
          {mode === "register" && (
            <div className="form-field">
              <label className="form-label">Display Name</label>
              <input
                className="input"
                placeholder="e.g. Mom, Dad, Alex"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={handleKey}
              />
            </div>
          )}

          <div className="form-field">
            <label className="form-label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKey}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
            />
          </div>

          <button
            className="btn-primary auth-submit"
            onClick={handleSubmit}
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading
              ? "Please wait..."
              : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <div className="auth-switch">
          {mode === "login" ? (
            <>No account? <button className="auth-link" onClick={() => { setMode("register"); setError(null); }}>Sign up</button></>
          ) : (
            <>Already have an account? <button className="auth-link" onClick={() => { setMode("login"); setError(null); }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}