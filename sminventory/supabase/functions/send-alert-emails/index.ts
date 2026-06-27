// supabase/functions/send-alert-emails/index.ts
//
// Daily digest emailer for SMInventory.
//
// For every household with email_alerts_enabled = true, this function:
//   1. Loads that household's items
//   2. Computes which are "expiring soon / expired" (within alert_window_days)
//      and which are "low stock" (quantity <= low_stock_threshold)
//   3. Skips the household if neither list has anything in it
//   4. Looks up each member's email via the auth admin API
//   5. Sends one digest email per member via Resend
//
// Required secrets (set with `supabase secrets set`):
//   RESEND_API_KEY   - API key from https://resend.com
//   ALERT_FROM_EMAIL - verified sender, e.g. "SMInventory <alerts@yourdomain.com>"
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the Supabase platform for every Edge Function — no need to set them.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("ALERT_FROM_EMAIL") ?? "SMInventory <alerts@example.com>";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Household/item names are user-controlled text. Escape before interpolating
// into the HTML email body so a name like `<img src=x onerror=...>` can't
// inject markup into the rendered message.
function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiration_date: string;
  low_stock_threshold: number | null;
}

interface Household {
  id: string;
  name: string;
  alert_window_days: number | null;
  email_alerts_enabled: boolean | null;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr + "T00:00:00");
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function classify(items: Item[], windowDays: number) {
  const expiring = items.filter((i) => daysUntil(i.expiration_date) <= windowDays);
  const lowStock = items.filter(
    (i) => i.low_stock_threshold !== null && Number(i.quantity) <= Number(i.low_stock_threshold)
  );
  return { expiring, lowStock };
}

function renderEmail(household: Household, expiring: Item[], lowStock: Item[]): string {
  const row = (label: string) => `<li style="margin-bottom:4px;">${label}</li>`;

  const expiringRows = expiring
    .map((i) => {
      const d = daysUntil(i.expiration_date);
      const when = d < 0 ? `expired ${Math.abs(d)}d ago` : d === 0 ? "expires today" : `expires in ${d}d`;
      return row(`<strong>${escapeHtml(i.name)}</strong> — ${escapeHtml(when)}`);
    })
    .join("");

  const lowStockRows = lowStock
    .map((i) =>
      row(
        `<strong>${escapeHtml(i.name)}</strong> — ${escapeHtml(i.quantity)} ${escapeHtml(i.unit)} left ` +
        `(alert at ${escapeHtml(i.low_stock_threshold)})`
      )
    )
    .join("");

  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#1A4A2E;">${escapeHtml(household.name)} — Inventory Alerts</h2>
      ${expiring.length > 0 ? `
        <h3 style="color:#92400E; margin-top:20px;">Expiring / Expired (${expiring.length})</h3>
        <ul style="padding-left:20px; color:#333;">${expiringRows}</ul>
      ` : ""}
      ${lowStock.length > 0 ? `
        <h3 style="color:#3730A3; margin-top:20px;">Running Low (${lowStock.length})</h3>
        <ul style="padding-left:20px; color:#333;">${lowStockRows}</ul>
      ` : ""}
      <p style="color:#7A8C7A; font-size:12px; margin-top:24px;">
        Open SMInventory to manage these items. You can turn off these emails anytime
        from Household Settings.
      </p>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to send email to ${to}: ${res.status} ${text}`);
  }
}

Deno.serve(async (_req) => {
  try {
    const { data: households, error: hhErr } = await supabase
      .from("households")
      .select("id, name, alert_window_days, email_alerts_enabled")
      .eq("email_alerts_enabled", true);

    if (hhErr) throw hhErr;

    let emailsSent = 0;
    let householdsProcessed = 0;

    for (const household of (households ?? []) as Household[]) {
      const { data: items, error: itemsErr } = await supabase
        .from("items")
        .select("id, name, quantity, unit, expiration_date, low_stock_threshold")
        .eq("household_id", household.id);

      if (itemsErr) {
        console.error(`Failed to load items for household ${household.id}:`, itemsErr.message);
        continue;
      }

      const windowDays = household.alert_window_days ?? 3;
      const { expiring, lowStock } = classify((items ?? []) as Item[], windowDays);

      if (expiring.length === 0 && lowStock.length === 0) continue;

      const { data: members, error: memErr } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", household.id);

      if (memErr) {
        console.error(`Failed to load members for household ${household.id}:`, memErr.message);
        continue;
      }

      const html = renderEmail(household, expiring, lowStock);
      const subject = `SMInventory: ${expiring.length + lowStock.length} item${
        expiring.length + lowStock.length > 1 ? "s" : ""
      } need attention`;

      for (const member of members ?? []) {
        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(member.user_id);
        if (userErr || !userData?.user?.email) continue;
        await sendEmail(userData.user.email, subject, html);
        emailsSent++;
      }

      householdsProcessed++;
    }

    return new Response(
      JSON.stringify({ ok: true, householdsProcessed, emailsSent }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
