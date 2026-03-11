import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_MATCHES = [
  { id: '1', teamA: 'CSK', teamB: 'MI', date: 'Mar 22', time: '7:30 PM' },
  { id: '2', teamA: 'RCB', teamB: 'KKR', date: 'Mar 23', time: '3:30 PM' },
  { id: '3', teamA: 'DC', teamB: 'SRH', date: 'Mar 24', time: '7:30 PM' },
  { id: '4', teamA: 'GT', teamB: 'LSG', date: 'Mar 25', time: '7:30 PM' },
];

type Tab = 'matches' | 'leaderboard';
type LeaderboardView = 'daily' | 'weekly' | 'tournament';

export default function ArenaZone() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('matches');
  const [lbView, setLbView] = useState<LeaderboardView>('tournament');
  const [predictions, setPredictions] = useState<Record<string, string>>({});

  const predict = (matchId: string, team: string) => {
    setPredictions(prev => ({ ...prev, [matchId]: team }));
  };

  return (
    <motion.div layoutId="zone-arena" className="min-h-screen bg-arena text-arena-accent">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-arena/90 border-b border-arena-accent/20">
        <button onClick={() => navigate('/')} className="p-1">
          <ArrowLeft size={22} className="text-arena-accent" />
        </button>
        <h1 className="font-display font-bold text-xl">🏏 IPL Arena</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-arena-accent/20">
        <button
          onClick={() => setTab('matches')}
          className={`flex-1 py-3 font-display font-semibold text-sm text-center transition-colors ${
            tab === 'matches' ? 'text-arena-accent border-b-2 border-arena-accent' : 'text-arena-accent/50'
          }`}
        >
          Matches
        </button>
        <button
          onClick={() => setTab('leaderboard')}
          className={`flex-1 py-3 font-display font-semibold text-sm text-center transition-colors ${
            tab === 'leaderboard' ? 'text-arena-accent border-b-2 border-arena-accent' : 'text-arena-accent/50'
          }`}
        >
          Leaderboard
        </button>
      </div>

      <div className="p-4 zone-scroll zone-scroll-arena overflow-y-auto" style={{ height: 'calc(100vh - 7rem)' }}>
        {tab === 'matches' && (
          <div className="space-y-3">
            {MOCK_MATCHES.map(match => (
              <div key={match.id} className="bg-arena-accent/10 rounded-xl p-4 border border-arena-accent/20">
                <div className="text-xs text-arena-accent/60 font-body mb-2">{match.date} • {match.time}</div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => predict(match.id, match.teamA)}
                    className={`flex-1 py-3 rounded-lg font-display font-bold text-lg transition-all ${
                      predictions[match.id] === match.teamA
                        ? 'bg-arena-accent text-arena scale-105'
                        : 'bg-arena-accent/20 text-arena-accent'
                    }`}
                  >
                    {match.teamA}
                  </button>
                  <span className="text-arena-accent/40 font-display font-bold text-xs">VS</span>
                  <button
                    onClick={() => predict(match.id, match.teamB)}
                    className={`flex-1 py-3 rounded-lg font-display font-bold text-lg transition-all ${
                      predictions[match.id] === match.teamB
                        ? 'bg-arena-accent text-arena scale-105'
                        : 'bg-arena-accent/20 text-arena-accent'
                    }`}
                  >
                    {match.teamB}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="flex gap-1 bg-arena-accent/10 rounded-lg p-1">
              {(['daily', 'weekly', 'tournament'] as LeaderboardView[]).map(v => (
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
            <div className="space-y-2">
              {[
                { rank: 1, name: 'No predictions yet', pts: 0 },
              ].map((entry, i) => (
                <div key={i} className="flex items-center gap-3 bg-arena-accent/10 rounded-lg p-3">
                  <span className="font-display font-black text-arena-accent text-lg w-8">#{entry.rank}</span>
                  <span className="flex-1 font-body text-arena-accent">{entry.name}</span>
                  <span className="font-display font-bold text-arena-accent">{entry.pts} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
