import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

// Web Push library for Deno
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    webpush.setVapidDetails(
      "mailto:family-adda@lovable.app",
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find events happening tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Also check recurring dates (same month-day for birthdays/anniversaries)
    const monthDay = tomorrowStr.slice(5); // MM-DD

    const { data: events } = await supabase
      .from("family_events")
      .select("*, families(name)")
      .or(`event_date.eq.${tomorrowStr}`);

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No events tomorrow" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const event of events) {
      // Get all push subscriptions for this family
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("family_id", event.family_id)
        .eq("notify_on_events", true);

      if (!subs || subs.length === 0) continue;

      const typeEmoji =
        event.type === "birthday"
          ? "🎂"
          : event.type === "anniversary"
          ? "💍"
          : "✈️";

      const payload = JSON.stringify({
        title: `${typeEmoji} Tomorrow: ${event.title}`,
        body: `Don't forget — ${event.title} is tomorrow!`,
        tag: `event-${event.id}`,
        url: "/calendar",
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent++;
        } catch (pushErr: any) {
          // If subscription expired, remove it
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
          console.error("Push send error:", pushErr.message);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sent} notifications` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Event reminder error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
