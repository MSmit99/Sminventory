import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useHousehold(user) {
  const [household, setHousehold] = useState(null);
  const [members,   setMembers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const fetchHousehold = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: membership, error: memErr } = await supabase
        .from("household_members")
        .select("household_id, role, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memErr) throw memErr;

      if (!membership) {
        setHousehold(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      const { data: hh, error: hhErr } = await supabase
        .from("households")
        .select("*")
        .eq("id", membership.household_id)
        .single();

      if (hhErr) throw hhErr;
      setHousehold(hh);

      const { data: allMembers, error: allErr } = await supabase
        .from("household_members")
        .select("*")
        .eq("household_id", hh.id);

      if (allErr) throw allErr;
      setMembers(allMembers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchHousehold();
  }, [user, fetchHousehold]);

  // Realtime: anything that changes who's in the household, their role/
  // display name, or the household's own settings should be reflected
  // for every connected member without anyone needing to refresh — same
  // pattern useInventory.js/useItemHistory.js already use for items and
  // history. Two channels because they're two different tables; both
  // just trigger a full refetch, which is cheap and keeps this simple.
  useEffect(() => {
    if (!household?.id) return;

    const membersChannel = supabase
      .channel("household-members-changes")
      .on("postgres_changes", {
        event:  "*",
        schema: "public",
        table:  "household_members",
        filter: `household_id=eq.${household.id}`,
      }, () => fetchHousehold())
      .subscribe();

    const householdChannel = supabase
      .channel("household-settings-changes")
      .on("postgres_changes", {
        event:  "*",
        schema: "public",
        table:  "households",
        filter: `id=eq.${household.id}`,
      }, () => fetchHousehold())
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(householdChannel);
    };
  }, [household?.id, fetchHousehold]);

  async function createHousehold(name, displayName) {
    const { data, error } = await supabase.rpc("create_household", {
      p_name:         name,
      p_display_name: displayName,
    });
    if (error) throw new Error(error.message);
    await fetchHousehold();
    return data;
  }

  async function joinHousehold(inviteCode, displayName) {
    const { error } = await supabase.rpc("join_household", {
      p_invite_code:  inviteCode,
      p_display_name: displayName,
    });
    if (error) throw new Error(error.message);
    await fetchHousehold();
  }

  // Update household settings (e.g. custom_categories, custom_locations)
  async function updateHousehold(updates) {
    if (!household) throw new Error("No household to update.");
    const { error } = await supabase
      .from("households")
      .update(updates)
      .eq("id", household.id);
    if (error) throw new Error(error.message);
    await fetchHousehold();
  }

  // Update the current user's own display name. RLS only allows a member
  // to touch their own row, and a column-level grant means even that row
  // can only have display_name/email_alerts_opted_in changed — role and
  // household_id are immutable.
  async function updateDisplayName(displayName) {
    const { error } = await supabase
      .from("household_members")
      .update({ display_name: displayName })
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    await fetchHousehold();
  }

  // Personal opt-in/out of alert emails, layered on top of the household's
  // own email_alerts_enabled toggle (the household toggle has to be on for
  // this to do anything — checked at the UI level and again server-side
  // by the emailer, which sends only when both are true).
  async function updateEmailOptIn(optedIn) {
    const { error } = await supabase
      .from("household_members")
      .update({ email_alerts_opted_in: optedIn })
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    await fetchHousehold();
  }

  // Owner-only: remove another member. The RPC itself re-checks that the
  // caller is the owner (RLS/grants alone can't express "only the owner
  // may delete someone else's row"), and also regenerates the invite code
  // so the removed person can't rejoin with one they still remember.
  async function removeMember(userId) {
    const { error } = await supabase.rpc("remove_member", { p_user_id: userId });
    if (error) throw new Error(error.message);
    await fetchHousehold();
  }

  // Owner-only: invalidate the current invite code and get a fresh one,
  // independent of removing anyone — e.g. if the code leaked some other way.
  async function regenerateInviteCode() {
    const { data, error } = await supabase.rpc("regenerate_invite_code");
    if (error) throw new Error(error.message);
    await fetchHousehold();
    return data;
  }

  // Owner-only: hand ownership to another member, becoming a regular
  // member yourself. The RPC re-checks ownership server-side and is the
  // only path allowed past the role-immutability trigger.
  async function transferOwnership(newOwnerId) {
    const { error } = await supabase.rpc("transfer_ownership", { p_new_owner_id: newOwnerId });
    if (error) throw new Error(error.message);
    await fetchHousehold();
  }

  // Leave the current household. A regular member can always do this. If
  // you're the owner, the RPC only allows it when you're the sole member
  // (and then deletes the household entirely) — otherwise it'll error
  // asking you to transfer ownership first.
  async function leaveHousehold() {
    const { error } = await supabase.rpc("leave_household");
    if (error) throw new Error(error.message);
    await fetchHousehold();
  }

  return {
    household, members, loading, error,
    createHousehold, joinHousehold, updateHousehold,
    updateDisplayName, updateEmailOptIn,
    removeMember, regenerateInviteCode,
    transferOwnership, leaveHousehold,
    refetch: fetchHousehold,
  };
}