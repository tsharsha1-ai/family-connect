import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

async function fetchFeedData(familyId: string) {
  // Fetch members + feed items + polls all in parallel
  const [membersRes, scoresRes, eventsRes, postsRes, blessingsRes, predsRes, pollsRes] = await Promise.all([
    supabase.from('family_members').select('user_id, display_name').eq('family_id', familyId),
    supabase.from('game_scores').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(20),
    supabase.from('family_events').select('*').eq('family_id', familyId),
    supabase.from('style_posts').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(15),
    supabase.from('blessings').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(15),
    supabase.from('predictions').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(15),
    supabase.from('family_polls').select('*').eq('family_id', familyId).order('created_at', { ascending: false }),
  ]);

  const nm: Record<string, string> = {};
  (membersRes.data || []).forEach(m => { nm[m.user_id] = m.display_name; });

  // Build feed items
  const feedItems: FeedItem[] = [];

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

  // Parse polls
  const polls = (pollsRes.data || []).map(p => ({
    ...p,
    options: p.options as string[],
  })) as Poll[];

  // Fetch votes for polls
  let votes: Vote[] = [];
  if (polls.length > 0) {
    const pollIds = polls.map(p => p.id);
    const { data: voteData } = await supabase.from('poll_votes').select('*').in('poll_id', pollIds);
    votes = (voteData || []) as Vote[];
  }

  return { feedItems, polls, votes, nameMap: nm };
}

export default function FamilyFeed() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery({
    queryKey: ['family-feed', profile?.family_id],
    queryFn: () => fetchFeedData(profile!.family_id),
    enabled: !!profile?.family_id && !!user,
  });

  const items = data?.feedItems ?? [];
  const polls = data?.polls ?? [];
  const votes = data?.votes ?? [];
  const nameMap = data?.nameMap ?? {};

  const refreshPolls = () => queryClient.invalidateQueries({ queryKey: ['family-feed', profile?.family_id] });

  function formatTime(ts: string) {
    try {
      const d = parseISO(ts);
      if (isToday(d)) return `Today ${format(d, 'h:mm a')}`;
      if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
      return format(d, 'MMM d, h:mm a');
    } catch { return ''; }
  }

  const pinnedPolls = polls.filter(p => p.is_pinned && p.is_active);
  const activePolls = polls.filter(p => !p.is_pinned && p.is_active && new Date(p.expires_at) > new Date());
  const endedPolls = polls.filter(p => !p.is_active || new Date(p.expires_at) <= new Date()).slice(0, 5);

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
        <CreatePollDialog onCreated={() => refreshPolls()} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {pinnedPolls.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-display font-semibold text-primary uppercase tracking-wide">📌 Pinned</span>
              {pinnedPolls.map(p => (
                <PollCard key={p.id} poll={p} votes={votes.filter(v => v.poll_id === p.id)} nameMap={nameMap} onRefresh={refreshPolls} />
              ))}
            </div>
          )}

          {activePolls.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wide">Active Polls</span>
              {activePolls.map(p => (
                <PollCard key={p.id} poll={p} votes={votes.filter(v => v.poll_id === p.id)} nameMap={nameMap} onRefresh={refreshPolls} />
              ))}
            </div>
          )}

          {endedPolls.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wide">Ended</span>
              {endedPolls.map(p => (
                <PollCard key={p.id} poll={p} votes={votes.filter(v => v.poll_id === p.id)} nameMap={nameMap} onRefresh={refreshPolls} />
              ))}
            </div>
          )}

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
