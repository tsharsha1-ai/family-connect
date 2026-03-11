import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Blessing {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string;
}

export default function WisdomZone() {
  const navigate = useNavigate();
  const { user, profile, family } = useAuth();
  const [blessing, setBlessing] = useState('');
  const [blessings, setBlessings] = useState<Blessing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const fetchBlessings = useCallback(async () => {
    if (!family?.id) return;
    const { data } = await supabase
      .from('blessings')
      .select('id, content, created_at, user_id')
      .eq('family_id', family.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(b => b.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
      const nameMap = new Map(profiles?.map(p => [p.id, p.display_name]) ?? []);
      setBlessings(data.map(b => ({ ...b, display_name: nameMap.get(b.user_id) || 'Someone' })));
    } else {
      setBlessings([]);
    }
    setLoading(false);
  }, [family?.id]);

  useEffect(() => { fetchBlessings(); }, [fetchBlessings]);

  const sendBlessing = async () => {
    if (!blessing.trim() || !user || !family) return;
    setSending(true);
    const { error } = await supabase.from('blessings').insert({
      user_id: user.id,
      family_id: family.id,
      content: blessing.trim(),
    });
    if (error) { toast.error('Failed to send blessing'); setSending(false); return; }
    toast.success('Blessing sent 🙏');
    setBlessing('');
    setSending(false);
    fetchBlessings();
  };

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?\s]+)/);
    return match?.[1] || null;
  };

  const ytId = getYouTubeId(videoUrl);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <motion.div layoutId="zone-wisdom" className="min-h-screen bg-wisdom-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-wisdom/40 border-b border-wisdom sticky top-0 z-10 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="p-1">
          <ArrowLeft size={20} className="text-wisdom-accent" />
        </button>
        <h1 className="font-display font-bold text-lg text-wisdom-accent">🪷 Wisdom Well</h1>
      </div>

      <div className="overflow-y-auto p-3 space-y-4 pb-20" style={{ height: 'calc(100vh - 2.75rem)' }}>
        {/* Blessing Input */}
        <div className="space-y-2">
          <h2 className="font-display font-semibold text-sm text-wisdom-accent uppercase tracking-wide">
            Share a Blessing
          </h2>
          <textarea
            value={blessing}
            onChange={(e) => setBlessing(e.target.value)}
            placeholder="Write your daily blessing..."
            className="w-full p-3 rounded-xl bg-popover border border-wisdom/60 font-body text-sm text-foreground placeholder:text-muted-foreground resize-none h-16 focus:outline-none focus:ring-2 focus:ring-wisdom-accent/30"
            maxLength={300}
          />
          <button
            onClick={sendBlessing}
            disabled={!blessing.trim() || sending}
            className="w-full py-2.5 bg-wisdom-accent text-primary-foreground rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
          >
            <Send size={14} /> {sending ? 'Sending...' : 'Send Blessing'}
          </button>
        </div>

        {/* Blessings Feed */}
        <div className="space-y-2">
          <h2 className="font-display font-semibold text-sm text-wisdom-accent uppercase tracking-wide">
            Blessings
          </h2>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-wisdom-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : blessings.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-1">🙏</p>
              <p className="text-sm text-muted-foreground font-body">No blessings yet. Be the first!</p>
            </div>
          ) : (
            blessings.map(b => (
              <div key={b.id} className="bg-popover rounded-xl p-3 border border-wisdom/50 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-display font-semibold text-sm text-wisdom-accent">{b.display_name}</span>
                  <span className="text-xs text-muted-foreground font-body">{timeAgo(b.created_at)}</span>
                </div>
                <p className="font-body text-sm text-foreground leading-relaxed">{b.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Devotional Video */}
        <div className="space-y-2">
          <h2 className="font-display font-semibold text-sm text-wisdom-accent uppercase tracking-wide">
            Devotional Songs
          </h2>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste YouTube link..."
            className="w-full p-2.5 rounded-xl bg-popover border border-wisdom/60 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-wisdom-accent/30"
          />
          {ytId && (
            <div className="rounded-xl overflow-hidden border border-wisdom/50 shadow-sm">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowFullScreen
                title="Devotional Video"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
