import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Trophy, Cake, Image, Heart, Star, Clock } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import CreatePollDialog from '@/components/CreatePollDialog';
import PollCard from '@/components/PollCard';

interface FeedItem {
  id: string;
  type: 'game_score' | 'birthday' | 'style_post' | 'blessing' | 'prediction';
  emoji: string;
  text: string;
  timestamp: string;
}

interface Poll {
  id: string;
  family_id: string;
  created_by: string;
  question: string;
  options: string[];
  is_pinned: boolean;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

interface Vote {
  id: string;
  poll_id: string;
  user_id: string;
  selected_option: number;
}

export default function FamilyFeed() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  const fetchPolls = useCallback(async () => {
    if (!profile?.family_id) return;
    const { data: pollData } = await supabase
      .from('family_polls')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('created_at', { ascending: false });

    const parsed = (pollData || []).map(p => ({
      ...p,
      options: p.options as string[],
    })) as Poll[];
    setPolls(parsed);

    if (parsed.length > 0) {
      const pollIds = parsed.map(p => p.id);
      const { data: voteData } = await supabase
        .from('poll_votes')
        .select('*')
        .in('poll_id', pollIds);
      setVotes((voteData || []) as Vote[]);
    } else {
      setVotes([]);
    }
  }, [profile?.family_id]);

  useEffect(() => {
    if (!profile?.family_id || !user) return;
    fetchAll();
  }, [profile?.family_id, user]);

  async function fetchAll() {
    setLoading(true);
    const { data: members } = await supabase
      .from('family_members')
      .select('user_id, display_name')
      .eq('family_id', profile!.family_id);

    const nm: Record<string, string> = {};
    (members || []).forEach(m => { nm[m.user_id] = m.display_name; });
    setNameMap(nm);

    await Promise.all([fetchFeedItems(nm), fetchPolls()]);
    setLoading(false);
  }

  async function fetchFeedItems(nm: Record<string, string>) {
    if (!profile?.family_id) return;
    const feedItems: FeedItem[] = [];

    const [scoresRes, eventsRes, postsRes, blessingsRes, predsRes] = await Promise.all([
      supabase.from('game_scores').select('*').eq('family_id', profile.family_id).order('created_at', { ascending: false }).limit(20),
      supabase.from('family_events').select('*').eq('family_id', profile.family_id),
      supabase.from('style_posts').select('*').eq('family_id', profile.family_id).order('created_at', { ascending: false }).limit(15),
      supabase.from('blessings').select('*').eq('family_id', profile.family_id).order('created_at', { ascending: false }).limit(15),
      supabase.from('predictions').select('*').eq('family_id', profile.family_id).order('created_at', { ascending: false }).limit(15),
    ]);

    (scoresRes.data || []).forEach(s => {
      feedItems.push({ id: `gs-${s.id}`, type: 'game_score', emoji: '🏆',
        text: `${nm[s.user_id] || 'Someone'} scored ${s.score} in ${s.game === 'whack-a-mole' ? 'Whack-a-Mole' : s.game}!`,
        timestamp: s.created_at });
    });

    const today = format(new Date(), 'MM-dd');
    (eventsRes.data || []).forEach(e => {
      if (e.event_date.slice(5) === today) {
        const emoji = e.type === 'birthday' ? '🎂' : e.type === 'anniversary' ? '💍' : '✈️';
        const label = e.type === 'birthday' ? '🎂 Birthday' : e.type === 'anniversary' ? '💍 Anniversary' : '✈️ Travel';
        feedItems.push({ id: `ev-${e.id}`, type: 'birthday', emoji, text: `${label}: ${e.title}`, timestamp: new Date().toISOString() });
      }
    });

    (postsRes.data || []).forEach(p => {
      feedItems.push({ id: `sp-${p.id}`, type: 'style_post', emoji: '📸',
        text: `${nm[p.user_id] || 'Someone'} shared ${p.caption ? `"${p.caption}"` : 'a photo'} in Style Circle`,
        timestamp: p.created_at });
    });

    (blessingsRes.data || []).forEach(b => {
      const preview = b.content.length > 60 ? b.content.slice(0, 60) + '…' : b.content;
      feedItems.push({ id: `bl-${b.id}`, type: 'blessing', emoji: '🪷',
        text: `${nm[b.user_id] || 'Someone'} sent a blessing: "${preview}"`,
        timestamp: b.created_at });
    });

    (predsRes.data || []).forEach(p => {
      feedItems.push({ id: `pr-${p.id}`, type: 'prediction', emoji: '🏏',
        text: `${nm[p.user_id] || 'Someone'} predicted ${p.predicted_winner} in IPL Arena`,
        timestamp: p.created_at });
    });

    feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setItems(feedItems);
  }

  function formatTime(ts: string) {
    try {
      const d = parseISO(ts);
      if (isToday(d)) return `Today ${format(d, 'h:mm a')}`;
      if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
      return format(d, 'MMM d, h:mm a');
    } catch { return ''; }
  }

  // Separate polls
  const pinnedPolls = polls.filter(p => p.is_pinned && p.is_active);
  const activePolls = polls.filter(p => !p.is_pinned && p.is_active && new Date(p.expires_at) > new Date());
  const endedPolls = polls.filter(p => !p.is_active || new Date(p.expires_at) <= new Date()).slice(0, 5);

  // Group feed items by date
  const grouped: Record<string, FeedItem[]> = {};
  items.forEach(item => {
    const d = parseISO(item.timestamp);
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d, yyyy');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  return (
    <div className="flex-1 pb-20 px-4 pt-2">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-display text-lg font-bold text-foreground">Family Feed</h1>
        <CreatePollDialog onCreated={() => fetchPolls()} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pinned Polls */}
          {pinnedPolls.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-display font-semibold text-primary uppercase tracking-wide">📌 Pinned</span>
              {pinnedPolls.map(p => (
                <PollCard key={p.id} poll={p} votes={votes.filter(v => v.poll_id === p.id)} nameMap={nameMap} onRefresh={fetchPolls} />
              ))}
            </div>
          )}

          {/* Active Polls */}
          {activePolls.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wide">Active Polls</span>
              {activePolls.map(p => (
                <PollCard key={p.id} poll={p} votes={votes.filter(v => v.poll_id === p.id)} nameMap={nameMap} onRefresh={fetchPolls} />
              ))}
            </div>
          )}

          {/* Ended Polls */}
          {endedPolls.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wide">Ended</span>
              {endedPolls.map(p => (
                <PollCard key={p.id} poll={p} votes={votes.filter(v => v.poll_id === p.id)} nameMap={nameMap} onRefresh={fetchPolls} />
              ))}
            </div>
          )}

          {/* Activity Timeline */}
          {items.length === 0 && polls.length === 0 ? (
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
      )}
    </div>
  );
}
