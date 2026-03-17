import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Plus, X, BarChart3 } from 'lucide-react';

const DURATION_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '6', label: '6 hours' },
  { value: '12', label: '12 hours' },
  { value: '24', label: '1 day' },
  { value: '48', label: '2 days' },
  { value: '72', label: '3 days' },
];

interface CreatePollDialogProps {
  onCreated: () => void;
}

export default function CreatePollDialog({ onCreated }: CreatePollDialogProps) {
  const { profile, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [durationHours, setDurationHours] = useState('24');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function addOption() {
    if (options.length < 4) setOptions([...options, '']);
  }

  function removeOption(i: number) {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, val: string) {
    const copy = [...options];
    copy[i] = val;
    setOptions(copy);
  }

  async function handleSubmit() {
    if (!user || !profile?.family_id) return;
    const trimmedQ = question.trim();
    const trimmedOpts = options.map(o => o.trim()).filter(Boolean);
    if (!trimmedQ || trimmedOpts.length < 2) {
      toast({ title: 'Please fill in question and at least 2 options', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const hours = parseInt(durationHours);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('family_polls').insert({
      family_id: profile.family_id,
      created_by: user.id,
      question: trimmedQ,
      options: trimmedOpts,
      is_pinned: isPinned,
      duration_hours: hours,
      expires_at: expiresAt,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: 'Failed to create poll', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Poll created! 📊' });
      setQuestion('');
      setOptions(['', '']);
      setDurationHours('24');
      setIsPinned(false);
      setOpen(false);
      onCreated();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 rounded-full">
          <BarChart3 size={16} /> New Poll
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Create a Poll</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold">Question</Label>
            <Input
              placeholder="What should we order for dinner?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Options</Label>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <button onClick={() => removeOption(i)} className="text-muted-foreground hover:text-destructive">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <Button variant="ghost" size="sm" onClick={addOption} className="gap-1 text-xs">
                <Plus size={14} /> Add option
              </Button>
            )}
          </div>

          <div>
            <Label className="text-xs font-semibold">Duration</Label>
            <Select value={durationHours} onValueChange={setDurationHours}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">📌 Pin this poll</Label>
            <Switch checked={isPinned} onCheckedChange={setIsPinned} />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? 'Creating…' : 'Create Poll'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
