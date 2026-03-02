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
      // One household per user — maybeSingle won't throw on no rows
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

      // Fetch household details
      const { data: hh, error: hhErr } = await supabase
        .from("households")
        .select("*")
        .eq("id", membership.household_id)
        .single();

      if (hhErr) throw hhErr;
      setHousehold(hh);

      // Fetch all members — RLS now allows this via get_my_household_id()
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

  async function createHousehold(name, displayName) {
    const { data: hh, error: hhErr } = await supabase
      .from("households")
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (hhErr) throw hhErr;

    const { error: memErr } = await supabase
      .from("household_members")
      .insert({
        household_id: hh.id,
        user_id:      user.id,
        role:         "owner",
        display_name: displayName,
      });

    if (memErr) throw memErr;
    await fetchHousehold();
    return hh;
  }

  async function joinHousehold(inviteCode, displayName) {
    // Look up household by invite code
    const { data: hh, error: hhErr } = await supabase
      .from("households")
      .select("*")
      .eq("invite_code", inviteCode.trim().toLowerCase())
      .maybeSingle();

    if (hhErr) throw hhErr;
    if (!hh) throw new Error("Invalid invite code. Please check and try again.");

    // Check invite hasn't expired
    if (hh.invite_expires_at && new Date(hh.invite_expires_at) < new Date()) {
      throw new Error("This invite code has expired. Ask the household owner for a new one.");
    }

    const { error: memErr } = await supabase
      .from("household_members")
      .insert({
        household_id: hh.id,
        user_id:      user.id,
        role:         "member",
        display_name: displayName,
      });

    if (memErr) {
      if (memErr.code === "23505") throw new Error("You are already a member of a household.");
      throw memErr;
    }

    await fetchHousehold();
    return hh;
  }

  return { household, members, loading, error, createHousehold, joinHousehold, refetch: fetchHousehold };
}