import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Check, LogOut, Bell, BellOff, Camera, Users, MessageSquare } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, family, profile, memberships, signOut, refreshProfile, setActiveFamily } = useAuth();
  const { isSupported, loading, permission, activityEnabled, toggleActivityNotifications, eventsEnabled, toggleEventNotifications } = usePushNotifications();
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyCode = () => {
    if (family?.access_code) {
      navigator.clipboard.writeText(family.access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeMembership = memberships.find(m => m.family_id === profile?.family_id);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeMembership) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      
      const { error: updateError } = await supabase
        .from('family_members')
        .update({ avatar_url: avatarUrl })
        .eq('id', activeMembership.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const avatarUrl = profile?.avatar_url;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-[calc(100vh-7.5rem)]">
      {/* Avatar */}
      <div className="relative mb-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative w-24 h-24 rounded-full overflow-hidden border-3 border-primary bg-muted flex items-center justify-center group"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">{profile?.role === 'kid' ? '🪁' : profile?.role === 'woman' ? '🌸' : profile?.role === 'elder' ? '🪷' : '🏏'}</span>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={24} className="text-white" />
          </div>
        </button>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
      </div>
      <p className="text-xs text-muted-foreground font-body mb-6">Tap to change photo</p>

      {/* Family Code */}
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

        {memberships.length > 1 && (
          <div className="bg-popover rounded-xl p-4 border border-border flex items-center gap-3">
            <Users size={20} className="text-primary" />
            <div>
              <p className="font-display font-semibold text-sm text-foreground">
                Member of {memberships.length} families
              </p>
              <p className="text-xs text-muted-foreground font-body">
                Switch from the header
              </p>
            </div>
          </div>
        )}

        {/* Notification Toggles */}
        {isSupported && (
          <div className="space-y-3">
            {/* Event Reminders */}
            <div className="bg-popover rounded-xl p-4 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={20} className={eventsEnabled ? 'text-primary' : 'text-muted-foreground'} />
                <div>
                  <p className="font-display font-semibold text-sm text-foreground">Event Reminders</p>
                  <p className="text-xs text-muted-foreground font-body">
                    {permission === 'denied'
                      ? 'Blocked in browser settings'
                      : 'Birthdays, anniversaries & travel'}
                  </p>
                </div>
              </div>
              <Switch
                checked={eventsEnabled}
                onCheckedChange={toggleEventNotifications}
                disabled={loading || permission === 'denied'}
              />
            </div>

            {/* Activity Updates */}
            <div className="bg-popover rounded-xl p-4 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare size={20} className={activityEnabled ? 'text-primary' : 'text-muted-foreground'} />
                <div>
                  <p className="font-display font-semibold text-sm text-foreground">Activity Updates</p>
                  <p className="text-xs text-muted-foreground font-body">
                    {permission === 'denied'
                      ? 'Blocked in browser settings'
                      : 'Posts, blessings, scores & polls'}
                  </p>
                </div>
              </div>
              <Switch
                checked={activityEnabled}
                onCheckedChange={toggleActivityNotifications}
                disabled={loading || permission === 'denied'}
              />
            </div>
          </div>
        )}
