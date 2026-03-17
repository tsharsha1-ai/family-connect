import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Heart, AtSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FamilyMemberOption {
  id: string;
  user_id: string;
  display_name: string;
}

interface Blessing {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string;
  tagged_member_id: string | null;
  tagged_name: string | null;
  like_count: number;
  liked_by_me: boolean;
}

interface SharedSong {
  id: string;
  youtube_url: string;
  created_at: string;
  display_name: string;
}

async function fetchBlessingsData(familyId: string, userId: string) {
  const [blessingsRes, membersRes, songsRes] = await Promise.all([
    supabase
      .from('blessings')
      .select('id, content, created_at, user_id, tagged_member_id')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('family_members')
      .select('id, user_id, display_name')
      .eq('family_id', familyId),
    supabase
      .from('devotional_songs')
      .select('id, youtube_url, created_at, user_id')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const blessings = blessingsRes.data || [];
  const members = membersRes.data || [];
  const songs = songsRes.data || [];

  const nameByUserId = new Map(members.map(m => [m.user_id, m.display_name]));
  const nameByMemberId = new Map(members.map(m => [m.id, m.display_name]));

  let likeCounts = new Map<string, number>();
  let myLikes = new Set<string>();

  if (blessings.length > 0) {
    const blessingIds = blessings.map(b => b.id);
    const { data: likes } = await supabase
      .from('blessing_likes')
      .select('blessing_id, user_id')
      .in('blessing_id', blessingIds);
    likes?.forEach(l => {
      likeCounts.set(l.blessing_id, (likeCounts.get(l.blessing_id) || 0) + 1);
      if (l.user_id === userId) myLikes.add(l.blessing_id);
    });
  }

  return {
    blessings: blessings.map(b => ({
      ...b,
      display_name: nameByUserId.get(b.user_id) || 'Someone',
      tagged_name: b.tagged_member_id ? nameByMemberId.get(b.tagged_member_id) || null : null,
      like_count: likeCounts.get(b.id) || 0,
      liked_by_me: myLikes.has(b.id),
    })) as Blessing[],
    members,
    songs: songs.map(s => ({
      ...s,
      display_name: nameByUserId.get(s.user_id) || 'Someone',
    })) as SharedSong[],
  };
}

export default function WisdomZone() {
  const navigate = useNavigate();
  const { user, profile, family } = useAuth();
  const queryClient = useQueryClient();
  const [blessing, setBlessing] = useState('');
  const [sending, setSending] = useState(false);
  const [songUrl, setSongUrl] = useState('');
  const [sendingSong, setSendingSong] = useState(false);

  // Tagging
  const [taggedMember, setTaggedMember] = useState<FamilyMemberOption | null>(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['wisdom-blessings', family?.id, user?.id],
    queryFn: () => fetchBlessingsData(family!.id, user!.id),
    enabled: !!family?.id && !!user?.id,
  });

  const blessings = data?.blessings ?? [];
  const members = data?.members ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['wisdom-blessings', family?.id, user?.id] });

  const sendBlessing = async () => {
    if (!blessing.trim() || !user || !family) return;
    setSending(true);
    const { error } = await supabase.from('blessings').insert({
      user_id: user.id,
      family_id: family.id,
      content: blessing.trim(),
      tagged_member_id: taggedMember?.id || null,
    });
    if (error) { toast.error('Failed to send blessing'); setSending(false); return; }
    toast.success('Blessing sent 🙏');
    setBlessing('');
    setTaggedMember(null);
    setSending(false);
    invalidate();
  };

  const toggleLike = async (blessingId: string, currentlyLiked: boolean) => {
    if (!user) return;
    // Optimistic update via query cache
    queryClient.setQueryData(['wisdom-blessings', family?.id, user?.id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        blessings: old.blessings.map((b: Blessing) =>
          b.id === blessingId
            ? { ...b, liked_by_me: !currentlyLiked, like_count: b.like_count + (currentlyLiked ? -1 : 1) }
            : b
        ),
      };
    });

    if (currentlyLiked) {
      await supabase.from('blessing_likes').delete().eq('blessing_id', blessingId).eq('user_id', user.id);
    } else {
      await supabase.from('blessing_likes').insert({ blessing_id: blessingId, user_id: user.id });
    }
  };

  const filteredMembers = members.filter(m =>
    m.user_id !== user?.id &&
    m.display_name.toLowerCase().includes(memberSearch.toLowerCase())
  );

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

          {taggedMember && (
            <div className="flex items-center gap-2 bg-wisdom/20 rounded-lg px-3 py-1.5 w-fit">
              <AtSign size={14} className="text-wisdom-accent" />
              <span className="font-body text-sm text-foreground">{taggedMember.display_name}</span>
              <button onClick={() => setTaggedMember(null)} className="text-muted-foreground hover:text-foreground text-xs ml-1">✕</button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={blessing}
            onChange={(e) => setBlessing(e.target.value)}
            placeholder={taggedMember ? `Write a blessing for ${taggedMember.display_name}...` : 'Write your daily blessing...'}
            className="w-full p-3 rounded-xl bg-popover border border-wisdom/60 font-body text-sm text-foreground placeholder:text-muted-foreground resize-none h-16 focus:outline-none focus:ring-2 focus:ring-wisdom-accent/30"
            maxLength={300}
          />

          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowMemberPicker(!showMemberPicker)}
                className={`px-3 py-2.5 rounded-xl border font-display font-semibold text-sm flex items-center gap-1.5 transition-colors ${
                  showMemberPicker || taggedMember
                    ? 'border-wisdom-accent bg-wisdom/20 text-wisdom-accent'
                    : 'border-wisdom/60 bg-popover text-muted-foreground'
                }`}
              >
                <AtSign size={14} /> Tag
              </button>

              <AnimatePresence>
                {showMemberPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute bottom-full left-0 mb-2 w-56 bg-popover border border-border rounded-xl shadow-lg z-20 overflow-hidden"
                  >
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search members..."
                      className="w-full px-3 py-2 text-sm font-body border-b border-border bg-popover text-foreground placeholder:text-muted-foreground focus:outline-none"
                      autoFocus
                    />
                    <div className="max-h-40 overflow-y-auto">
                      {filteredMembers.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3 font-body">No members found</p>
                      ) : (
                        filteredMembers.map(m => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setTaggedMember(m);
                              setShowMemberPicker(false);
                              setMemberSearch('');
                              textareaRef.current?.focus();
                            }}
                            className="w-full text-left px-3 py-2 text-sm font-body text-foreground hover:bg-muted transition-colors"
                          >
                            {m.display_name}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={sendBlessing}
              disabled={!blessing.trim() || sending}
              className="flex-1 py-2.5 bg-wisdom-accent text-primary-foreground rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
            >
              <Send size={14} /> {sending ? 'Sending...' : 'Send Blessing'}
            </button>
          </div>
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
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-semibold text-sm text-wisdom-accent">{b.display_name}</span>
                    {b.tagged_name && (
                      <span className="text-xs text-muted-foreground font-body">
                        → <span className="text-wisdom-accent font-semibold">@{b.tagged_name}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-body">{timeAgo(b.created_at)}</span>
                </div>
                <p className="font-body text-sm text-foreground leading-relaxed mb-2">{b.content}</p>
                <button
                  onClick={() => toggleLike(b.id, b.liked_by_me)}
                  className="flex items-center gap-1.5 group"
                >
                  <Heart
                    size={16}
                    className={`transition-colors ${
                      b.liked_by_me
                        ? 'fill-destructive text-destructive'
                        : 'text-muted-foreground group-hover:text-destructive'
                    }`}
                  />
                  {b.like_count > 0 && (
                    <span className={`text-xs font-body ${b.liked_by_me ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {b.like_count}
                    </span>
                  )}
                </button>
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
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
