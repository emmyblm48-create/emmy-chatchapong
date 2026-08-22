// Sends a real OS-level Web Push notification for one personal (recipient_username IS NOT NULL)
// row inserted into public.notifications. Invoked by a Database Webhook trigger (see the
// "notify_push_on_insert" trigger applied via apply_migration) - NOT reachable from the app's
// anon-key client, since verify_jwt is disabled here and a shared secret is checked instead
// (this endpoint is a Postgres-to-Edge-Function webhook, not a user-facing API).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;
const PUSH_WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== PUSH_WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const row = payload?.record;
  if (!row || !row.recipient_username) {
    return new Response("ok", { status: 200 });
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("username", row.recipient_username);

  if (error) {
    console.error("push_subscriptions lookup failed", error);
    return new Response("ok", { status: 200 });
  }
  if (!subs || subs.length === 0) {
    return new Response("ok", { status: 200 });
  }

  const url = row.post_id ? `/index?post=${encodeURIComponent(row.post_id)}` : "/notification";
  const notifPayload = JSON.stringify({
    title: row.writer || "BLM48",
    body: row.action || "",
    avatar: row.avatar || "",
    url,
  });

  await Promise.all(
    subs.map(async (sub: { id: number; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notifPayload,
        );
      } catch (err: any) {
        const statusCode = err?.statusCode || err?.status;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("push send failed for subscription", sub.id, err);
        }
      }
    }),
  );

  return new Response("ok", { status: 200 });
});
