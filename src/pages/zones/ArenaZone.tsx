import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Check, Lock, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Match {
  id: string;
  team_a: string;
  team_b: string;
  match_date: string;
  match_time: string;
  venue: string;
  winner: string | null;
  status: string;
}

interface Prediction {
  match_id: string;
  predicted_winner: string;
  points_earned: number;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_points: number;
}

type Tab = 'matches' | 'leaderboard' | 'admin';
type LeaderboardView = 'daily' | 'tournament';

const TEAM_COLORS: Record<string, string> = {
  CSK: 'from-yellow-500 to-yellow-600',
  MI: 'from-blue-500 to-blue-700',
  RCB: 'from-red-600 to-red-800',
  KKR: 'from-purple-600 to-purple-800',
  DC: 'from-blue-400 to-blue-600',
  SRH: 'from-orange-500 to-orange-700',
  GT: 'from-cyan-600 to-cyan-800',
  LSG: 'from-sky-400 to-sky-600',
  RR: 'from-pink-500 to-pink-700',
  PBKS: 'from-red-500 to-red-600',
};

export default function ArenaZone() {
  const navigate = useNavigate();
  const { user, profile, family } = useAuth();
  const [tab, setTab] = useState<Tab>('matches');
  const [lbView, setLbView] = useState<LeaderboardView>('tournament');
  const [matches, setMatches] = useState<Match[]>([]);
  const [myPredictions, setMyPredictions] = useState<Map<string, Prediction>>(new Map());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [localPicks, setLocalPicks] = useState<Record<string, string>>({});
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const isAdmin = profile?.is_admin ?? false;

  const fetchMatches = useCallback(async () => {
    const { data } = await supabase
      .from('ipl_matches')
      .select('*')
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true });
    if (data) setMatches(data as Match[]);
  }, []);

  const fetchMyPredictions = useCallback(async () => {
    if (!user || !family) return;
    const { data } = await supabase
      .from('predictions')
      .select('match_id, predicted_winner, points_earned')
      .eq('user_id', user.id)
      .eq('family_id', family.id);
    const map = new Map<string, Prediction>();
    data?.forEach(p => map.set(p.match_id, p));
    setMyPredictions(map);
  }, [user, family]);

  const fetchLeaderboard = useCallback(async () => {
    if (!family) return;
    // Get all predictions for this family
    const { data: preds } = await supabase
      .from('predictions')
      .select('user_id, points_earned, match_id')
      .eq('family_id', family.id);

    if (!preds) { setLeaderboard([]); return; }

    // If daily view, filter to today's matches
    let filteredPreds = preds;
    if (lbView === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      const todayMatchIds = matches.filter(m => m.match_date === today).map(m => m.id);
      filteredPreds = preds.filter(p => todayMatchIds.includes(p.match_id));
    }

    // Aggregate points per user
    const pointsMap = new Map<string, number>();
    filteredPreds.forEach(p => {
      pointsMap.set(p.user_id, (pointsMap.get(p.user_id) || 0) + p.points_earned);
    });

    // Get display names
    const userIds = [...pointsMap.keys()];
    if (userIds.length === 0) { setLeaderboard([]); return; }

    const { data: members } = await supabase
      .from('family_members')
      .select('user_id, display_name')
      .eq('family_id', family.id)
      .in('user_id', userIds);

    const nameMap = new Map(members?.map(m => [m.user_id, m.display_name]) ?? []);

    const entries: LeaderboardEntry[] = userIds
      .map(uid => ({
        user_id: uid,
        display_name: nameMap.get(uid) || 'Unknown',
        total_points: pointsMap.get(uid) || 0,
      }))
      .sort((a, b) => b.total_points - a.total_points);

    setLeaderboard(entries);
  }, [family, lbView, matches]);

  useEffect(() => {
    fetchMatches().then(() => setLoading(false));
  }, [fetchMatches]);

  useEffect(() => { fetchMyPredictions(); }, [fetchMyPredictions]);
  useEffect(() => { if (tab === 'leaderboard') fetchLeaderboard(); }, [tab, fetchLeaderboard]);

  const submitPrediction = async (match: Match) => {
    const pick = localPicks[match.id];
    if (!pick || !user || !family) return;

    setSubmitting(match.id);
    const { error } = await supabase.from('predictions').insert({
      user_id: user.id,
      match_id: match.id,
      predicted_winner: pick,
      family_id: family.id,
      points_earned: 0,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Already predicted for this match!');
      } else {
        toast.error('Failed to submit prediction');
      }
      setSubmitting(null);
      return;
    }

    toast.success(`Prediction locked: ${pick} 🏏`);
    setMyPredictions(prev => new Map(prev).set(match.id, { match_id: match.id, predicted_winner: pick, points_earned: 0 }));
    setSubmitting(null);
  };

  const setMatchResult = async (match: Match, winner: string) => {
    // Update match
    const { error: matchErr } = await supabase
      .from('ipl_matches')
      .update({ winner, status: 'completed' })
      .eq('id', match.id);

    if (matchErr) { toast.error('Failed to update result'); return; }

    // Award 10 points to correct predictions across all families
    const { error: pointsErr } = await supabase
      .from('predictions')
      .update({ points_earned: 10 })
      .eq('match_id', match.id)
      .eq('predicted_winner', winner);

    if (pointsErr) console.error('Points update error:', pointsErr);

    // Set 0 points for wrong predictions
    await supabase
      .from('predictions')
      .update({ points_earned: 0 })
      .eq('match_id', match.id)
      .neq('predicted_winner', winner);

    toast.success(`Result set: ${winner} wins! 🎉`);
    fetchMatches();
    fetchMyPredictions();
  };

  // Group matches by date
  const matchesByDate = matches.reduce<Record<string, Match[]>>((acc, m) => {
    (acc[m.match_date] ??= []).push(m);
    return acc;
  }, {});

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const isMatchLocked = (match: Match) => {
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    return new Date() >= matchDateTime || match.status === 'completed';
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <motion.div layoutId="zone-arena" className="min-h-screen bg-arena text-arena-accent">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-arena/90 border-b border-arena-accent/20 sticky top-0 z-10 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="p-1">
          <ArrowLeft size={22} className="text-arena-accent" />
        </button>
        <h1 className="font-display font-bold text-xl">🏏 IPL Arena</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-arena-accent/20">
        {(['matches', 'leaderboard', ...(isAdmin ? ['admin'] as const : [])] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 font-display font-semibold text-sm text-center transition-colors capitalize ${
              tab === t ? 'text-arena-accent border-b-2 border-arena-accent' : 'text-arena-accent/50'
            }`}
          >
            {t === 'admin' ? '⚙️ Results' : t}
          </button>
        ))}
      </div>

      <div className="p-4 overflow-y-auto pb-24" style={{ height: 'calc(100vh - 7rem)' }}>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'matches' ? (
          <div className="space-y-3">
            {Object.entries(matchesByDate).map(([date, dateMatches]) => {
              const isToday = date === today;
              const isExpanded = expandedDate === date || isToday;

              return (
                <div key={date}>
                  <button
                    onClick={() => setExpandedDate(isExpanded && !isToday ? null : date)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-display font-semibold text-sm mb-2 ${
                      isToday ? 'bg-arena-accent text-arena' : 'bg-arena-accent/10 text-arena-accent'
                    }`}
                  >
                    <span>{formatDate(date)} {isToday && '• TODAY'}</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {isExpanded && dateMatches.map(match => {
                    const prediction = myPredictions.get(match.id);
                    const locked = isMatchLocked(match);
                    const hasPredicted = !!prediction;
                    const localPick = localPicks[match.id];

                    return (
                      <div key={match.id} className="bg-arena-accent/10 rounded-xl p-4 border border-arena-accent/20 mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-arena-accent/60 font-body">{formatTime(match.match_time)}</span>
                          {match.status === 'completed' && (
                            <span className="text-xs font-display font-bold text-green-400 flex items-center gap-1">
                              <Trophy size={12} /> {match.winner} won
                            </span>
                          )}
                          {locked && match.status !== 'completed' && (
                            <span className="text-xs text-arena-accent/40 font-body flex items-center gap-1">
                              <Lock size={10} /> Locked
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-arena-accent/40 font-body mb-2 truncate">{match.venue}</p>

                        <div className="flex items-center gap-2 mb-2">
                          <button
                            disabled={locked || hasPredicted}
                            onClick={() => setLocalPicks(p => ({ ...p, [match.id]: match.team_a }))}
                            className={`flex-1 py-3 rounded-lg font-display font-bold text-base transition-all ${
                              (hasPredicted && prediction?.predicted_winner === match.team_a)
                                ? `bg-gradient-to-r ${TEAM_COLORS[match.team_a] || 'from-primary to-primary'} text-white shadow-lg`
                                : localPick === match.team_a
                                ? `bg-gradient-to-r ${TEAM_COLORS[match.team_a] || 'from-primary to-primary'} text-white`
                                : 'bg-arena-accent/20 text-arena-accent'
                            } disabled:cursor-not-allowed`}
                          >
                            {match.team_a}
                            {hasPredicted && prediction?.predicted_winner === match.team_a && (
                              <Check size={14} className="inline ml-1" />
                            )}
                          </button>
                          <span className="text-arena-accent/40 font-display font-bold text-xs">VS</span>
                          <button
                            disabled={locked || hasPredicted}
                            onClick={() => setLocalPicks(p => ({ ...p, [match.id]: match.team_b }))}
                            className={`flex-1 py-3 rounded-lg font-display font-bold text-base transition-all ${
                              (hasPredicted && prediction?.predicted_winner === match.team_b)
                                ? `bg-gradient-to-r ${TEAM_COLORS[match.team_b] || 'from-primary to-primary'} text-white shadow-lg`
                                : localPick === match.team_b
                                ? `bg-gradient-to-r ${TEAM_COLORS[match.team_b] || 'from-primary to-primary'} text-white`
                                : 'bg-arena-accent/20 text-arena-accent'
                            } disabled:cursor-not-allowed`}
                          >
                            {match.team_b}
                            {hasPredicted && prediction?.predicted_winner === match.team_b && (
                              <Check size={14} className="inline ml-1" />
                            )}
                          </button>
                        </div>

                        {/* Status row */}
                        {hasPredicted ? (
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-arena-accent/60 font-body flex items-center gap-1">
                              <Lock size={10} /> Your pick: <span className="font-semibold text-arena-accent">{prediction.predicted_winner}</span>
                            </p>
                            {match.status === 'completed' && (
                              <span className={`text-xs font-display font-bold ${prediction.points_earned > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {prediction.points_earned > 0 ? `+${prediction.points_earned} pts 🎯` : '0 pts ❌'}
                              </span>
                            )}
                          </div>
                        ) : !locked && localPick ? (
                          <button
                            onClick={() => submitPrediction(match)}
                            disabled={submitting === match.id}
                            className="w-full py-2 rounded-lg bg-arena-accent text-arena font-display font-semibold text-sm disabled:opacity-50 transition-opacity"
                          >
                            {submitting === match.id ? 'Submitting...' : `Lock in ${localPick}`}
                          </button>
                        ) : locked && !hasPredicted ? (
                          <p className="text-xs text-arena-accent/40 font-body text-center">Match locked — no prediction</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : tab === 'leaderboard' ? (
          <div className="space-y-4">
            <div className="flex gap-1 bg-arena-accent/10 rounded-lg p-1">
              {(['daily', 'tournament'] as LeaderboardView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setLbView(v)}
                  className={`flex-1 py-2 rounded-md font-display font-semibold text-xs capitalize transition-all ${
                    lbView === v ? 'bg-arena-accent text-arena' : 'text-arena-accent/60'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <Trophy size={32} className="mx-auto text-arena-accent/30 mb-2" />
                <p className="text-sm text-arena-accent/50 font-body">No predictions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 rounded-lg p-3 ${
                      i === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' :
                      i === 1 ? 'bg-gray-400/10 border border-gray-400/20' :
                      i === 2 ? 'bg-amber-700/10 border border-amber-700/20' :
                      'bg-arena-accent/10'
                    }`}
                  >
                    <span className="font-display font-black text-lg w-10 text-center">
                      {getRankEmoji(i + 1)}
                    </span>
                    <span className={`flex-1 font-body ${entry.user_id === user?.id ? 'text-arena-accent font-bold' : 'text-arena-accent/80'}`}>
                      {entry.display_name}
                      {entry.user_id === user?.id && ' (You)'}
                    </span>
                    <span className="font-display font-bold text-arena-accent">{entry.total_points} pts</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'admin' && isAdmin ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-arena-accent" />
              <h2 className="font-display font-bold text-sm text-arena-accent">Set Match Results</h2>
            </div>
            <p className="text-xs text-arena-accent/50 font-body mb-3">
              Select the winner for each completed match. Points are awarded automatically.
            </p>
            {matches.filter(m => m.status !== 'completed').map(match => {
              const locked = isMatchLocked(match);
              return (
                <div key={match.id} className="bg-arena-accent/10 rounded-xl p-4 border border-arena-accent/20">
                  <p className="text-xs text-arena-accent/60 font-body mb-1">
                    {formatDate(match.match_date)} • {formatTime(match.match_time)}
                  </p>
                  <p className="text-[10px] text-arena-accent/40 font-body mb-3 truncate">{match.venue}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMatchResult(match, match.team_a)}
                      disabled={!locked}
                      className={`flex-1 py-3 rounded-lg font-display font-bold text-sm bg-gradient-to-r ${TEAM_COLORS[match.team_a] || 'from-primary to-primary'} text-white disabled:opacity-30 transition-opacity`}
                    >
                      {match.team_a} Wins
                    </button>
                    <button
                      onClick={() => setMatchResult(match, match.team_b)}
                      disabled={!locked}
                      className={`flex-1 py-3 rounded-lg font-display font-bold text-sm bg-gradient-to-r ${TEAM_COLORS[match.team_b] || 'from-primary to-primary'} text-white disabled:opacity-30 transition-opacity`}
                    >
                      {match.team_b} Wins
                    </button>
                  </div>
                  {!locked && (
                    <p className="text-xs text-arena-accent/40 font-body text-center mt-2">
                      Match hasn't started yet
                    </p>
                  )}
                </div>
              );
            })}
            {matches.filter(m => m.status !== 'completed').length === 0 && (
              <p className="text-sm text-arena-accent/50 font-body text-center py-6">All results have been entered! 🎉</p>
            )}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
