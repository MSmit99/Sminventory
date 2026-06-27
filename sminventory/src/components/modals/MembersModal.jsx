import { useState } from "react";

export function MembersModal({
  household, members, user, userRole,
  onRemoveMember, onRegenerateInviteCode, onTransferOwnership, onLeaveHousehold,
  onClose,
}) {
  const [confirmingRemoveId,   setConfirmingRemoveId]   = useState(null);
  const [confirmingTransferId, setConfirmingTransferId] = useState(null);
  const [removingId,           setRemovingId]           = useState(null);
  const [transferringId,       setTransferringId]       = useState(null);
  const [removeError,          setRemoveError]          = useState(null);
  const [transferError,        setTransferError]        = useState(null);

  const [copied,          setCopied]          = useState(false);
  const [regenerating,    setRegenerating]    = useState(false);
  const [regenerateError, setRegenerateError] = useState(null);

  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [leaving,         setLeaving]         = useState(false);
  const [leaveError,      setLeaveError]      = useState(null);

  const isOwner = userRole === "owner";
  const isSoleMember = members.length <= 1;
  const canLeaveDirectly = !isOwner || isSoleMember;

  const sortedMembers = [...members].sort((a, b) => {
    if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
    return (a.display_name || "").localeCompare(b.display_name || "");
  });

  function copyInviteCode() {
    if (!household?.invite_code) return;
    navigator.clipboard.writeText(household.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConfirmRemove(memberId) {
    setRemovingId(memberId);
    setRemoveError(null);
    try {
      await onRemoveMember(memberId);
      setConfirmingRemoveId(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : String(err));
    } finally {
      setRemovingId(null);
    }
  }

  async function handleConfirmTransfer(memberId) {
    setTransferringId(memberId);
    setTransferError(null);
    try {
      await onTransferOwnership(memberId);
      setConfirmingTransferId(null);
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : String(err));
    } finally {
      setTransferringId(null);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenerateError(null);
    try {
      await onRegenerateInviteCode();
    } catch (err) {
      setRegenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegenerating(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    setLeaveError(null);
    try {
      await onLeaveHousehold();
      onClose();
    } catch (err) {
      setLeaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal__header">
          <h2 className="modal__title">Members</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>

        <div className="modal__body">
          <div className="settings-section">
            <div className="settings-section__title">
              <span style={{ fontFamily: "'DM Sans', sans-serif" }}>{members.length}</span>
              {" "}member{members.length !== 1 ? "s" : ""}
            </div>
            <div className="member-list">
              {sortedMembers.map(m => {
                const isMe          = m.user_id === user?.id;
                const canManage     = isOwner && !isMe;
                const confirmingRemove   = confirmingRemoveId === m.user_id;
                const confirmingTransfer = confirmingTransferId === m.user_id;

                return (
                  <div key={m.user_id} className="member-row">
                    <div className="member-row__avatar">
                      {(m.display_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="member-row__body">
                      <div className="member-row__name">
                        <span>{m.display_name || "Unnamed"}</span>
                        {isMe && <span className="member-row__you">(you)</span>}
                        <span className="member-row__role-badge">
                          {m.role === "owner" ? "Owner" : "Member"}
                        </span>
                      </div>
                      {m.joined_at && (
                        <div className="member-row__meta">
                          Joined {new Date(m.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                    </div>

                    {canManage && (
                      <div className="member-row__actions">
                        {confirmingTransfer ? (
                          <>
                            <button
                              className="btn-secondary"
                              style={{ padding: "6px 12px", fontSize: 12 }}
                              onClick={() => handleConfirmTransfer(m.user_id)}
                              disabled={transferringId === m.user_id}
                            >
                              {transferringId === m.user_id ? "Transferring..." : "Confirm"}
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: "6px 12px", fontSize: 12 }}
                              onClick={() => setConfirmingTransferId(null)}
                              disabled={transferringId === m.user_id}
                            >
                              Cancel
                            </button>
                          </>
                        ) : confirmingRemove ? (
                          <>
                            <button
                              className="btn-danger"
                              style={{ padding: "6px 12px", fontSize: 12 }}
                              onClick={() => handleConfirmRemove(m.user_id)}
                              disabled={removingId === m.user_id}
                            >
                              {removingId === m.user_id ? "Removing..." : "Confirm"}
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: "6px 12px", fontSize: 12 }}
                              onClick={() => setConfirmingRemoveId(null)}
                              disabled={removingId === m.user_id}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="icon-btn"
                              title={`Make ${m.display_name || "this member"} the owner`}
                              aria-label={`Make ${m.display_name || "this member"} the owner`}
                              onClick={() => { setConfirmingTransferId(m.user_id); setTransferError(null); }}
                            >
                              <CrownIcon />
                            </button>
                            <button
                              className="icon-btn icon-btn--danger"
                              title={`Remove ${m.display_name || "this member"}`}
                              aria-label={`Remove ${m.display_name || "this member"}`}
                              onClick={() => { setConfirmingRemoveId(m.user_id); setRemoveError(null); }}
                            >
                              <TrashIcon />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {removeError && <div className="auth-error" style={{ marginTop: 10 }}>{removeError}</div>}
            {transferError && <div className="auth-error" style={{ marginTop: 10 }}>{transferError}</div>}
            {!isOwner && (
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "10px 0 0" }}>
                Only the household owner can invite, remove, or transfer ownership to other members.
              </p>
            )}
          </div>

          {/* Invite code — owner only */}
          {isOwner && (
            <div className="settings-section">
              <div className="settings-section__title">Invite Someone</div>
              <div className="invite-box">
                <div className="invite-box__label">Share this code — only you can see it</div>
                <button className="invite-box__code-row" onClick={copyInviteCode} title="Click to copy">
                  <span>{household?.invite_code}</span>
                  <span className="invite-box__copy">{copied ? "Copied!" : "Copy"}</span>
                </button>
                <div className="invite-box__hint">
                  {household?.invite_expires_at && (
                    <>Expires {new Date(household.invite_expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. </>
                  )}
                  Regenerating immediately invalidates the current code — useful if it leaked, or any time you want to
                  be sure a past member can't rejoin with a code they still remember.
                </div>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 10 }}
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  {regenerating ? "Regenerating..." : "Regenerate Invite Code"}
                </button>
                {regenerateError && <div className="auth-error" style={{ marginTop: 8 }}>{regenerateError}</div>}
              </div>
            </div>
          )}

          {/* Leave household */}
          <div className="settings-section">
            <div className="settings-section__title">Leave Household</div>

            {!confirmingLeave ? (
              <>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 10px" }}>
                  {isOwner && !isSoleMember
                    ? "You're the owner. Transfer ownership to another member above before you can leave — a household always needs an owner."
                    : isOwner
                      ? "You're the only member. Leaving will permanently delete this household and everything in it — items, history, and settings."
                      : "You'll lose access to this household's inventory. You can rejoin later if the owner shares an invite code with you again."}
                </p>
                <button
                  className="btn-danger"
                  onClick={() => setConfirmingLeave(true)}
                  disabled={!canLeaveDirectly}
                  style={{ opacity: canLeaveDirectly ? 1 : 0.45 }}
                >
                  Leave Household
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "var(--status-expired-text)", margin: "0 0 10px", fontWeight: 600 }}>
                  {isOwner
                    ? "This permanently deletes the household, all its items, and its history. This cannot be undone."
                    : "Are you sure you want to leave this household?"}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-danger" onClick={handleLeave} disabled={leaving}>
                    {leaving ? "Leaving..." : "Yes, Leave"}
                  </button>
                  <button className="btn-secondary" onClick={() => setConfirmingLeave(false)} disabled={leaving}>
                    Cancel
                  </button>
                </div>
              </>
            )}
            {leaveError && <div className="auth-error" style={{ marginTop: 10 }}>{leaveError}</div>}
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function CrownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 18h20l-2-9-5 4-3-8-3 8-5-4-2 9z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}