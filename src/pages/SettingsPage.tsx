import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Copy, Check, LogOut, Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const { family, profile, signOut } = useAuth();
  const { isSupported, isSubscribed, loading, subscribe, unsubscribe, permission } = usePushNotifications();
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (family?.access_code) {
      navigator.clipboard.writeText(family.access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNotificationToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-[calc(100vh-7.5rem)]">
      {/* Family Code - dominant element */}
      <div className="text-center mb-8">
        <p className="text-sm font-body text-muted-foreground mb-2">Family Code</p>
        <p className="font-display font-black text-5xl tracking-[0.3em] text-foreground">
          {family?.access_code || '------'}
        </p>
        <button
          onClick={copyCode}
          className="mt-4 flex items-center gap-2 mx-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Copied!' : 'Copy ID'}
        </button>
        <p className="text-xs text-muted-foreground font-body mt-2">Share via WhatsApp to invite family</p>
      </div>

      {/* Settings Cards */}
      <div className="w-full max-w-xs space-y-4">
        <div className="bg-popover rounded-xl p-4 border border-border text-center">
          <p className="text-xs text-muted-foreground font-body mb-1">Family Name</p>
          <p className="font-display font-bold text-lg text-foreground">{family?.name || 'Your Family'}</p>
        </div>

        <div className="bg-popover rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground font-body mb-1">Logged in as</p>
          <p className="font-display font-semibold text-foreground">{profile?.display_name}</p>
          <p className="text-xs text-muted-foreground font-body capitalize">{profile?.role}</p>
        </div>

        {/* Push Notifications Toggle */}
        {isSupported && (
          <div className="bg-popover rounded-xl p-4 border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <Bell size={20} className="text-primary" />
              ) : (
                <BellOff size={20} className="text-muted-foreground" />
              )}
              <div>
                <p className="font-display font-semibold text-sm text-foreground">Event Reminders</p>
                <p className="text-xs text-muted-foreground font-body">
                  {permission === 'denied'
                    ? 'Blocked in browser settings'
                    : 'Get notified before family events'}
                </p>
              </div>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleNotificationToggle}
              disabled={loading || permission === 'denied'}
            />
          </div>
        )}

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive text-destructive font-display font-semibold"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
