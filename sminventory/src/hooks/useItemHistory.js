import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const PAGE_SIZE = 20;

/**
 * Fetches a single page of item history from Supabase, with optional
 * server-side filtering. Replaces the old flat `.limit(200)` fetch so
 * households with a long history can actually page back through all
 * of it instead of only ever seeing the most recent 200 entries.
 *
 * @param householdId
 * @param filters.page      1-indexed page number
 * @param filters.search    matched against item_name (case-insensitive, partial)
 * @param filters.action    "All" | "added" | "edited" | "removed"
 * @param filters.personId  "All" | a household member's user_id (matches changed_by)
 */
export function useItemHistory(householdId, filters = {}) {
  const { page = 1, search = "", action = "All", personId = "All" } = filters;

  const [history,    setHistory]    = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("item_history")
        .select("*", { count: "exact" })
        .eq("household_id", householdId);

      if (search.trim())   query = query.ilike("item_name", `%${search.trim()}%`);
      if (action !== "All") query = query.eq("action", action.toLowerCase());
      if (personId !== "All") query = query.eq("changed_by", personId);

      const from = (page - 1) * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      const { data, error: err, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (err) {
        setError(err.message);
        return;
      }
      setHistory(data || []);
      setTotalCount(count ?? 0);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [householdId, page, search, action, personId]);

  useEffect(() => {
    if (!householdId) {
      const t = setTimeout(() => { setHistory([]); setTotalCount(0); setLoading(false); }, 0);
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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return { history, totalCount, totalPages, pageSize: PAGE_SIZE, loading, error, refetch: fetchHistory };
}