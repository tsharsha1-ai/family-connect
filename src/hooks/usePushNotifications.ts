import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user, family } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activityEnabled, setActivityEnabled] = useState(true);
  const [eventsEnabled, setEventsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  useEffect(() => {
    supabase.functions.invoke('get-vapid-key').then(({ data }) => {
      if (data?.vapidPublicKey) setVapidKey(data.vapidPublicKey);
    });
  }, []);

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    });

    // Fetch preferences
    supabase
      .from('push_subscriptions')
      .select('notify_on_activity, notify_on_events')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setActivityEnabled(data.notify_on_activity);
          setEventsEnabled((data as any).notify_on_events ?? true);
        }
      });
  }, [user]);

  const ensurePushSubscription = useCallback(async (): Promise<boolean> => {
    if (!user || !family || !vapidKey) return false;

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      });
    }

    const subJson = sub.toJSON();
    const { error } = await supabase.functions.invoke('save-push-subscription', {
      body: {
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      },
    });

    if (error) throw error;
    setIsSubscribed(true);
    return true;
  }, [user, family, vapidKey]);

  const removePushSubscription = useCallback(async () => {
    if (!user) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();

    await supabase.functions.invoke('save-push-subscription', {
      body: { action: 'unsubscribe' },
    });
    setIsSubscribed(false);
  }, [user]);

  const toggleEventNotifications = useCallback(async (enabled: boolean) => {
    if (!user) return;
    setLoading(true);
    try {
      if (enabled && !isSubscribed) {
        const ok = await ensurePushSubscription();
        if (!ok) { setLoading(false); return; }
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .update({ notify_on_events: enabled } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      setEventsEnabled(enabled);

      // If both off, unsubscribe from push entirely
      if (!enabled && !activityEnabled) {
        await removePushSubscription();
      }
    } catch (err) {
      console.error('Toggle event notifications failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isSubscribed, activityEnabled, ensurePushSubscription, removePushSubscription]);

  const toggleActivityNotifications = useCallback(async (enabled: boolean) => {
    if (!user) return;
    setLoading(true);
    try {
      if (enabled && !isSubscribed) {
        const ok = await ensurePushSubscription();
        if (!ok) { setLoading(false); return; }
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .update({ notify_on_activity: enabled } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      setActivityEnabled(enabled);

      // If both off, unsubscribe from push entirely
      if (!enabled && !eventsEnabled) {
        await removePushSubscription();
      }
    } catch (err) {
      console.error('Toggle activity notifications failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isSubscribed, eventsEnabled, ensurePushSubscription, removePushSubscription]);

  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  return {
    permission, isSubscribed, isSupported, loading,
    activityEnabled, toggleActivityNotifications,
    eventsEnabled, toggleEventNotifications,
  };
}
