import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Trophy, Cake, Image, Heart, Star, Clock } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

interface FeedItem {
  id: string;
  type: 'game_score' | 'birthday' | 'style_post' | 'blessing' | 'prediction';
  icon: typeof Trophy;
  emoji: string;
  text: string;
  timestamp: string;
  color: string;
}

export default function FamilyFeed() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.family_id || !user) return;
    fetchFeed();
  }, [profile?.family_id, user]);

  async function fetchFeed() {
    if (!profile?.family_id) return;
    setLoading(true);

    // Fetch members for display names
    const { data: members } = await supabase
      .from('family_members')
      .select('user_id, display_name')
      .eq('family_id', profile.family_id);

    const nameMap: Record<string, string> = {};
    (members || []).forEach(m => { nameMap[m.user_id] = m.display_name; });

    const feedItems: FeedItem[] = [];

    // 1. Game scores (recent)
    const { data: scores } = await supabase
      .from('game_scores')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('created_at', { ascending: false })
      .limit(20);

    (scores || []).forEach(s => {
      feedItems.push({
        id: `gs-${s.id}`,
        type: 'game_score',
        icon: Trophy,
        emoji: '🏆',
        text: `${nameMap[s.user_id] || 'Someone'} scored ${s.score} in ${s.game === 'whack-a-mole' ? 'Whack-a-Mole' : s.game}!`,
        timestamp: s.created_at,
        color: 'text-yellow-500',
      });
    });

    // 2. Today's birthdays/anniversaries from family_events
    const today = format(new Date(), 'MM-dd');
    const { data: events } = await supabase
      .from('family_events')
      .select('*')
      .eq('family_id', profile.family_id);

    (events || []).forEach(e => {
      const eventMmDd = e.event_date.slice(5); // MM-DD
      if (eventMmDd === today) {
        const typeLabel = e.type === 'birthday' ? '🎂 Birthday' : e.type === 'anniversary' ? '💍 Anniversary' : '✈️ Travel';
        feedItems.push({
          id: `ev-${e.id}`,
          type: 'birthday',
          icon: Cake,
          emoji: e.type === 'birthday' ? '🎂' : e.type === 'anniversary' ? '💍' : '✈️',
          text: `${typeLabel}: ${e.title}`,
          timestamp: new Date().toISOString(),
          color: 'text-pink-500',
        });
      }
    });

    // 3. Style posts
    const { data: posts } = await supabase
      .from('style_posts')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('created_at', { ascending: false })
      .limit(15);

    (posts || []).forEach(p => {
      feedItems.push({
        id: `sp-${p.id}`,
        type: 'style_post',
        icon: Image,
        emoji: '📸',
        text: `${nameMap[p.user_id] || 'Someone'} shared ${p.caption ? `"${p.caption}"` : 'a photo'} in Style Circle`,
        timestamp: p.created_at,
        color: 'text-purple-500',
      });
    });

    // 4. Blessings
    const { data: blessings } = await supabase
      .from('blessings')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('created_at', { ascending: false })
      .limit(15);

    (blessings || []).forEach(b => {
      const preview = b.content.length > 60 ? b.content.slice(0, 60) + '…' : b.content;
      feedItems.push({
        id: `bl-${b.id}`,
        type: 'blessing',
        icon: Heart,
        emoji: '🪷',
        text: `${nameMap[b.user_id] || 'Someone'} sent a blessing: "${preview}"`,
        timestamp: b.created_at,
        color: 'text-orange-500',
      });
    });

    // 5. Predictions
    const { data: preds } = await supabase
      .from('predictions')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('created_at', { ascending: false })
      .limit(15);

    (preds || []).forEach(p => {
      feedItems.push({
        id: `pr-${p.id}`,
        type: 'prediction',
        icon: Star,
        emoji: '🏏',
        text: `${nameMap[p.user_id] || 'Someone'} predicted ${p.predicted_winner} in IPL Arena`,
        timestamp: p.created_at,
        color: 'text-green-500',
      });
    });

    // Sort by timestamp desc
    feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setItems(feedItems);
    setLoading(false);
  }

  function formatTime(ts: string) {
    try {
      const d = parseISO(ts);
      if (isToday(d)) return `Today ${format(d, 'h:mm a')}`;
      if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
      return format(d, 'MMM d, h:mm a');
    } catch {
      return '';
    }
  }

  // Group items by date
  const grouped: Record<string, FeedItem[]> = {};
  items.forEach(item => {
    const d = parseISO(item.timestamp);
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d, yyyy');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  return (
    <div className="flex-1 pb-20 px-4 pt-2">
      <h1 className="font-display text-lg font-bold text-foreground mb-3">Family Feed</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-3xl mb-2">📰</p>
          <p className="font-body text-sm">No activity yet. Start playing, posting, or sending blessings!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([dateLabel, groupItems]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-muted-foreground" />
                <span className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">{dateLabel}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {groupItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 bg-card rounded-xl p-3 border border-border"
                  >
                    <span className="text-xl mt-0.5">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body text-foreground leading-snug">{item.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatTime(item.timestamp)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
