import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const EMOJIS = ['🐹', '🏏', '🍬', '🎈', '⭐', '🦋'];
const GAME_DURATION = 30;
const GRID_SIZE = 9;

interface Mole {
  index: number;
  emoji: string;
  id: number;
}

interface LeaderboardEntry {
  display_name: string;
  score: number;
}

export default function KidsZone() {
  const navigate = useNavigate();
  const { user, profile, family } = useAuth();
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [moles, setMoles] = useState<Mole[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const moleIdRef = useRef(0);
  const scoreSavedRef = useRef(false);

  const fetchLeaderboard = useCallback(async () => {
    if (!family?.id) return;
    const { data } = await supabase
      .from('game_scores')
      .select('score, user_id')
      .eq('family_id', family.id)
      .eq('game', 'whack-a-mole')
      .order('score', { ascending: false })
      .limit(5);

    if (!data || data.length === 0) {
      setLeaderboard([]);
      return;
    }

    // Fetch display names from family_members
    const userIds = [...new Set(data.map(d => d.user_id))];
    const { data: members } = await supabase
      .from('family_members')
      .select('user_id, display_name')
      .eq('family_id', family.id)
      .in('user_id', userIds);

    const nameMap = new Map(members?.map(m => [m.user_id, m.display_name]) ?? []);
    setLeaderboard(data.map(d => ({
      display_name: nameMap.get(d.user_id) || 'Unknown',
      score: d.score,
    })));
  }, [family?.id]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const saveScore = useCallback(async (finalScore: number) => {
    if (!user?.id || !family?.id || scoreSavedRef.current) return;
    scoreSavedRef.current = true;
    await supabase.from('game_scores').insert({
      user_id: user.id,
      family_id: family.id,
      score: finalScore,
      game: 'whack-a-mole',
    });
    fetchLeaderboard();
  }, [user?.id, family?.id, fetchLeaderboard]);

  const spawnMole = useCallback(() => {
    const index = Math.floor(Math.random() * GRID_SIZE);
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const id = moleIdRef.current++;
    setMoles(prev => [...prev.filter(m => m.index !== index), { index, emoji, id }]);
    setTimeout(() => {
      setMoles(prev => prev.filter(m => m.id !== id));
    }, 1200);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(spawnMole, 700);
    return () => clearInterval(interval);
  }, [gameState, spawnMole]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (timeLeft <= 0) {
      setGameState('done');
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [gameState, timeLeft]);

  // Save score when game ends
  useEffect(() => {
    if (gameState === 'done') {
      saveScore(score);
    }
  }, [gameState, score, saveScore]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setMoles([]);
    scoreSavedRef.current = false;
    setGameState('playing');
  };

  const whack = (id: number) => {
    setScore(s => s + 10);
    setMoles(prev => prev.filter(m => m.id !== id));
  };

  return (
    <motion.div
      layoutId="zone-kids"
      className="min-h-screen bg-kids-bg"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-kids/30">
        <button onClick={() => navigate('/')} className="p-1">
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        <h1 className="font-display font-bold text-xl text-foreground">🎮 Kids Zone</h1>
      </div>

      <div className="p-4 flex flex-col items-center gap-4">
        {/* Score & Timer */}
        {gameState === 'playing' && (
          <div className="flex justify-between w-full max-w-xs">
            <div className="font-display font-bold text-kids-accent text-lg">Score: {score}</div>
            <div className="font-display font-bold text-foreground text-lg">⏱ {timeLeft}s</div>
          </div>
        )}

        {/* Game Grid */}
        {gameState === 'idle' && (
          <div className="text-center space-y-4 py-8">
            <div className="text-6xl animate-pop-up">🐹</div>
            <h2 className="font-display font-black text-2xl text-foreground">Whack-a-Mole!</h2>
            <p className="text-muted-foreground font-body">Tap the critters before they escape!</p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-kids-accent text-primary-foreground font-display font-bold text-lg rounded-full"
            >
              Start Game!
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs aspect-square">
            {Array.from({ length: GRID_SIZE }).map((_, i) => {
              const mole = moles.find(m => m.index === i);
              return (
                <div
                  key={i}
                  className="bg-kids/40 rounded-xl flex items-center justify-center aspect-square border-2 border-kids"
                >
                  <AnimatePresence>
                    {mole && (
                      <motion.button
                        key={mole.id}
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        onClick={() => whack(mole.id)}
                        className="text-4xl cursor-pointer select-none"
                      >
                        {mole.emoji}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {gameState === 'done' && (
          <div className="text-center space-y-4 py-8">
            <Trophy size={48} className="mx-auto text-kids-accent" />
            <h2 className="font-display font-black text-3xl text-foreground">{score} pts!</h2>
            <p className="text-muted-foreground font-body">Great job, superstar! 🌟</p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-kids-accent text-primary-foreground font-display font-bold text-lg rounded-full"
            >
              Play Again!
            </button>
          </div>
        )}

        {/* Leaderboard */}
        <div className="w-full max-w-xs mt-4">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2 mb-2">
            <Trophy size={16} className="text-kids-accent" /> Junior Top 5
          </h3>
          <div className="bg-popover rounded-xl p-3 space-y-2 border border-border">
            {leaderboard.length === 0 ? (
              <div className="flex justify-between font-body text-sm text-muted-foreground">
                <span>Play to set a score!</span>
                <span>-</span>
              </div>
            ) : (
              leaderboard.map((entry, i) => (
                <div key={i} className="flex justify-between font-body text-sm text-muted-foreground">
                  <span>{i + 1}. {entry.display_name}</span>
                  <span className="font-bold text-kids-accent">{entry.score}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
