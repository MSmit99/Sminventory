import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useItemHistory(householdId) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("item_history")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (err) {
        setError(err.message);
        return;
      }
      setHistory(data || []);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    if (!householdId) {
      const t = setTimeout(() => { setHistory([]); setLoading(false); }, 0);
      return () => clearTimeout(t);
    }

    fetchHistory();

    // Same realtime caveat as items/inventory: postgres_changes doesn't
    // reliably notify the initiating client, but it's a useful nudge for
    // *other* household members' tabs when someone else makes a change.
    const channel = supabase
      .channel("item-history-changes")
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "item_history",
        filter: `household_id=eq.${householdId}`,
      }, () => fetchHistory())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [householdId, fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}
