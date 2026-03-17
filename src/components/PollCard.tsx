import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Pin, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface PollCardProps {
  poll: Poll;
  votes: Vote[];
  nameMap: Record<string, string>;
  onRefresh: () => void;
}

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function tick() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Ended');
        setExpired(true);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 0) setRemaining(`${h}h ${m}m left`);
      else setRemaining(`${m}m left`);
      setExpired(false);
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return { remaining, expired };
}

export default function PollCard({ poll, votes, nameMap, onRefresh }: PollCardProps) {
  const { user, profile } = useAuth();
  const { remaining, expired } = useCountdown(poll.expires_at);
  const [voting, setVoting] = useState(false);

  const myVote = votes.find(v => v.user_id === user?.id);
  const hasVoted = !!myVote;
  const isCreator = poll.created_by === user?.id;
  const isAdmin = profile?.is_admin ?? false;
  const canManage = isCreator || isAdmin;
  const isEnded = expired || !poll.is_active;
  const showResults = hasVoted || isEnded;

  const totalVotes = votes.length;
  const optionVotes = (poll.options as string[]).map((_, i) =>
    votes.filter(v => v.selected_option === i)
  );

  async function castVote(optionIndex: number) {
    if (!user || hasVoted || isEnded) return;
    setVoting(true);
    const { error } = await supabase.from('poll_votes').insert({
      poll_id: poll.id,
      user_id: user.id,
      selected_option: optionIndex,
    });
    setVoting(false);
    if (error) {
      toast({ title: 'Could not vote', description: error.message, variant: 'destructive' });
    } else {
      onRefresh();
    }
  }

  async function togglePin() {
    await supabase.from('family_polls').update({ is_pinned: !poll.is_pinned }).eq('id', poll.id);
    onRefresh();
  }

  async function closePoll() {
    await supabase.from('family_polls').update({ is_active: false }).eq('id', poll.id);
    onRefresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${
        poll.is_pinned
          ? 'border-primary/40 bg-primary/5'
          : isEnded
          ? 'border-border bg-muted/40 opacity-75'
          : 'border-border bg-card'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{poll.question}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            by {nameMap[poll.created_by] || 'Someone'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {poll.is_pinned && <Pin size={13} className="text-primary" />}
          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${isEnded ? 'text-muted-foreground' : 'text-green-600'}`}>
            <Clock size={11} /> {remaining}
          </span>
        </div>
      </div>

      {/* Options / Results */}
      <div className="space-y-2">
        {(poll.options as string[]).map((opt, i) => {
          const count = optionVotes[i].length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyChoice = myVote?.selected_option === i;

          if (showResults) {
            return (
              <div key={i} className="relative">
                <div
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between px-3 py-2 rounded-lg">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    {isMyChoice && <CheckCircle2 size={13} className="text-primary" />}
                    {opt}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">{pct}% ({count})</span>
                </div>
              </div>
            );
          }

          return (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs font-medium h-auto py-2.5"
              disabled={voting}
              onClick={() => castVote(i)}
            >
              {opt}
            </Button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-muted-foreground">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </span>
        {canManage && (
          <div className="flex gap-1.5">
            <button onClick={togglePin} className="text-[10px] text-muted-foreground hover:text-primary">
              {poll.is_pinned ? 'Unpin' : 'Pin'}
            </button>
            {!isEnded && (
              <button onClick={closePoll} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5">
                <XCircle size={11} /> Close
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
