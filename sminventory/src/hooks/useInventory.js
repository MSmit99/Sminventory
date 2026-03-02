import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { getStatus } from "../utils/statusUtils";

export function useInventory(householdId, user) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("items")
        .select("*")
        .eq("household_id", householdId)
        .order("expiration_date", { ascending: true });
      if (err) {
        setError(err.message);
        return;
      }
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    if (!householdId) {
      // Defer state updates to avoid synchronous setState in effect body
      const t = setTimeout(() => { setItems([]); setLoading(false); }, 0);
      return () => clearTimeout(t);
    }

    fetchItems();

    const channel = supabase
      .channel("items-changes")
      .on("postgres_changes", {
        event:  "*",
        schema: "public",
        table:  "items",
        filter: `household_id=eq.${householdId}`,
      }, () => fetchItems())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [householdId, fetchItems]);

  const stats = useMemo(() => ({
    total:        items.length,
    fresh:        items.filter(i => getStatus(i.expiration_date).key === "fresh").length,
    expiringSoon: items.filter(i => getStatus(i.expiration_date).key === "warning").length,
    expired:      items.filter(i => getStatus(i.expiration_date).key === "expired").length,
  }), [items]);

  const expiringItems = useMemo(
    () => items.filter(i => ["warning", "expired"].includes(getStatus(i.expiration_date).key)),
    [items]
  );

  async function addItem(form) {
    const { error: err } = await supabase.from("items").insert({
      household_id:    householdId,
      name:            form.name,
      category:        form.category,
      quantity:        parseFloat(form.quantity),
      unit:            form.unit,
      expiration_date: form.expirationDate,
      location:        form.location,
      brand:           form.brand || null,
      notes:           form.notes || null,
      added_by:        user.id,
      added_by_name:   user.user_metadata?.display_name || user.email,
    });
    if (err) throw err;
  }

  async function updateItem(id, form) {
    const { error: err } = await supabase.from("items").update({
      name:            form.name,
      category:        form.category,
      quantity:        parseFloat(form.quantity),
      unit:            form.unit,
      expiration_date: form.expirationDate,
      location:        form.location,
      brand:           form.brand || null,
      notes:           form.notes || null,
    }).eq("id", id);
    if (err) throw err;
  }

  async function deleteItem(id) {
    const { error: err } = await supabase.from("items").delete().eq("id", id);
    if (err) throw err;
  }

  async function deleteItems(ids) {
    const { error: err } = await supabase.from("items").delete().in("id", [...ids]);
    if (err) throw err;
  }

  return { items, stats, expiringItems, loading, error, addItem, updateItem, deleteItem, deleteItems };
}