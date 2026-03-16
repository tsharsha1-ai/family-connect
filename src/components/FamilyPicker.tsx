import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PERSONA_CONFIG } from '@/types/family';
import type { PersonaRole } from '@/types/family';
import { Plus, LogOut } from 'lucide-react';
import { toast } from 'sonner';

type JoinStep = 'list' | 'join-code' | 'join-persona' | 'create-name' | 'create-persona';

export default function FamilyPicker() {
  const { user, memberships, setActiveFamily, signOut, refreshProfile } = useAuth();
  const [step, setStep] = useState<JoinStep>('list');
  const [accessCode, setAccessCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [persona, setPersona] = useState<PersonaRole | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newAccessCode, setNewAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleJoinByCode = async () => {
    if (accessCode.length !== 6) { setError('Enter a valid 6-digit code'); return; }
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('families')
      .select('id')
      .eq('access_code', accessCode)
      .maybeSingle();

    if (err || !data) { setError('Invalid Family Code'); setLoading(false); return; }

    // Check if already a member
    const existing = memberships.find(m => m.family_id === data.id);
    if (existing) {
      setActiveFamily(data.id);
      setLoading(false);
      return;
    }

    setFamilyId(data.id);
    setIsAdmin(false);
    setLoading(false);
    setStep('join-persona');
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) { setError('Please enter a family name'); return; }
    setLoading(true);
    setError('');
    const code = generateCode();
    const { data, error: err } = await supabase
      .from('families')
      .insert({ name: familyName.trim(), access_code: code, created_by: user?.id })
      .select()
      .single();

    if (err) { setError(err.message); setLoading(false); return; }
    setFamilyId(data.id);
    setNewAccessCode(code);
    setIsAdmin(true);
    setLoading(false);
    setStep('create-persona');
  };

  const handleJoinWithPersona = async () => {
    if (!persona || !displayName.trim() || !familyId || !user) {
      setError('Please fill all fields');
      return;
    }
    setLoading(true);
    setError('');

    const { error: err } = await supabase.from('family_members').insert({
      user_id: user.id,
      family_id: familyId,
      display_name: displayName.trim(),
      role: persona,
      is_admin: isAdmin,
    });

    if (err) { setError(err.message); setLoading(false); return; }

    await refreshProfile();
    setActiveFamily(familyId);
    setLoading(false);
    toast.success('Joined family!');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <AnimatePresence mode="wait">
        {step === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-sm w-full"
          >
            <h1 className="font-display text-2xl font-bold mb-1 text-center">Your Families</h1>
            <p className="text-muted-foreground font-body text-sm text-center mb-6">
              Pick a family to enter
            </p>

            <div className="space-y-3 mb-6">
              {memberships.map((m) => {
                const config = PERSONA_CONFIG[m.role];
                return (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveFamily(m.family_id)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-popover border border-border text-left"
                  >
                    <span className="text-3xl">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-foreground truncate">
                        {m.family.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-body">
                        {m.display_name} · {config.label}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setStep('join-code'); setError(''); }}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-semibold flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Join Another Family
              </button>
              <button
                onClick={() => { setStep('create-name'); setError(''); }}
                className="w-full py-3 rounded-lg bg-secondary text-secondary-foreground font-display font-semibold"
              >
                🏡 Create a New Family
              </button>
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-destructive text-destructive font-display font-semibold"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </motion.div>
        )}

        {step === 'join-code' && (
          <motion.div
            key="join-code"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-sm w-full space-y-4"
          >
            <h2 className="font-display text-2xl font-bold">Enter Family Code</h2>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="● ● ● ● ● ●"
              className="w-full py-4 px-4 rounded-lg bg-popover border border-border font-display text-2xl text-center tracking-[0.5em] text-foreground placeholder:text-muted-foreground"
              maxLength={6}
              inputMode="numeric"
            />
            {error && <p className="text-destructive text-sm font-body">{error}</p>}
            <button
              onClick={handleJoinByCode}
              disabled={loading || accessCode.length !== 6}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-display font-semibold disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Join Family'}
            </button>
            <button onClick={() => { setStep('list'); setError(''); }} className="w-full py-2 text-muted-foreground text-sm">← Back</button>
          </motion.div>
        )}

        {step === 'create-name' && (
          <motion.div
            key="create-name"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-sm w-full space-y-4"
          >
            <h2 className="font-display text-2xl font-bold">Name Your Family</h2>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g., The Sharma Family"
              className="w-full py-3 px-4 rounded-lg bg-popover border border-border font-body text-foreground placeholder:text-muted-foreground"
              maxLength={50}
            />
            {error && <p className="text-destructive text-sm font-body">{error}</p>}
            <button
              onClick={handleCreateFamily}
              disabled={loading}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-display font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Family'}
            </button>
            <button onClick={() => { setStep('list'); setError(''); }} className="w-full py-2 text-muted-foreground text-sm">← Back</button>
          </motion.div>
        )}

        {(step === 'join-persona' || step === 'create-persona') && (
          <motion.div
            key="persona"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-sm w-full space-y-4"
          >
            <h2 className="font-display text-2xl font-bold text-center">Your Role in This Family</h2>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(PERSONA_CONFIG) as [PersonaRole, typeof PERSONA_CONFIG[PersonaRole]][]).map(([key, config]) => (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPersona(key as PersonaRole)}
                  className={`flex flex-col items-center py-6 rounded-xl border-2 transition-all font-display ${
                    persona === key ? 'border-primary bg-primary/10 shadow-lg' : 'border-border bg-popover'
                  }`}
                >
                  <span className="text-4xl mb-2">{config.icon}</span>
                  <span className="font-semibold text-foreground">{config.label}</span>
                </motion.button>
              ))}
            </div>

            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name in this family"
              className="w-full py-3 px-4 rounded-lg bg-popover border border-border font-body text-foreground placeholder:text-muted-foreground"
              maxLength={30}
            />

            {step === 'create-persona' && newAccessCode && (
              <div className="bg-popover rounded-lg p-4 text-center border border-border">
                <p className="text-xs text-muted-foreground font-body mb-1">Your Family Code</p>
                <p className="font-display text-3xl font-bold tracking-widest text-foreground">{newAccessCode}</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Share this with family members!</p>
              </div>
            )}

            {error && <p className="text-destructive text-sm font-body">{error}</p>}
            <button
              onClick={handleJoinWithPersona}
              disabled={loading || !persona || !displayName.trim()}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-display font-semibold disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Family'}
            </button>
            <button onClick={() => { setStep('list'); setError(''); }} className="w-full py-2 text-muted-foreground text-sm">← Back</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
