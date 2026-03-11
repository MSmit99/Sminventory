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

  return { household, members, loading, error, createHousehold, joinHousehold, updateHousehold, refetch: fetchHousehold };
}