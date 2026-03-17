import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACTIVITY_META: Record<string, { emoji: string; verb: string }> = {
  style_posts: { emoji: "📸", verb: "shared a photo in Style Circle" },
  blessings: { emoji: "🪷", verb: "sent a blessing" },
  game_scores: { emoji: "🏆", verb: "scored in a game" },
  family_polls: { emoji: "📊", verb: "created a poll" },
  predictions: { emoji: "🏏", verb: "made a prediction" },
  family_events: { emoji: "📅", verb: "added a calendar event" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { family_id, actor_user_id, activity_type, detail } = await req.json();

    if (!family_id || !activity_type) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    webpush.setVapidDetails("mailto:family-adda@lovable.app", vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get subscriptions for the family, excluding the actor, where activity notifications are on
    let query = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("family_id", family_id)
      .eq("notify_on_activity", true);

    if (actor_user_id) {
      query = query.neq("user_id", actor_user_id);
    }

    const { data: subs } = await query;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ message: "No subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get actor name
    let actorName = "Someone";
    if (actor_user_id) {
      const { data: member } = await supabase
        .from("family_members")
        .select("display_name")
        .eq("user_id", actor_user_id)
        .eq("family_id", family_id)
        .single();
      if (member) actorName = member.display_name;
    }

    const meta = ACTIVITY_META[activity_type] || { emoji: "🔔", verb: "did something" };
    const title = `${meta.emoji} ${actorName} ${meta.verb}`;
    const body = detail || "";

    const payload = JSON.stringify({
      title,
      body,
      tag: `activity-${activity_type}-${Date.now()}`,
      url: "/feed",
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (pushErr: any) {
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        console.error("Push error:", pushErr.message);
      }
    }

    return new Response(JSON.stringify({ message: `Sent ${sent} notifications` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Activity notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
