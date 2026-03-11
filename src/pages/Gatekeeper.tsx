import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type { PersonaRole } from '@/types/family';
import { PERSONA_CONFIG } from '@/types/family';

type Step = 'welcome' | 'create-or-join' | 'create' | 'join' | 'persona' | 'signup';

export default function Gatekeeper() {
  const [step, setStep] = useState<Step>('welcome');
  const [familyName, setFamilyName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [persona, setPersona] = useState<PersonaRole | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleCreateFamily = async () => {
    if (!familyName.trim()) { setError('Please enter a family name'); return; }
    setLoading(true);
    setError('');
    const code = generateCode();
    const { data, error: err } = await supabase
      .from('families')
      .insert({ name: familyName.trim(), access_code: code, created_by: 'pending' })
      .select()
      .single();

    if (err) { setError(err.message); setLoading(false); return; }
    setFamilyId(data.id);
    setAccessCode(code);
    setIsAdmin(true);
    setLoading(false);
    setStep('persona');
  };

  const handleJoinFamily = async () => {
    if (accessCode.length !== 6) { setError('Enter a valid 6-digit code'); return; }
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('families')
      .select('id')
      .eq('access_code', accessCode)
      .maybeSingle();

    if (err || !data) { setError('Invalid Family Code. Please check and try again.'); setLoading(false); return; }
    setFamilyId(data.id);
    setIsAdmin(false);
    setLoading(false);
    setStep('persona');
  };

  const handleSignUp = async () => {
    if (!email || !password || !displayName || !persona || !familyId) {
      setError('Please fill all fields');
      return;
    }
    setLoading(true);
    setError('');

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (authErr) { setError(authErr.message); setLoading(false); return; }
    if (!authData.user) { setError('Signup failed'); setLoading(false); return; }

    // Update family created_by if admin
    if (isAdmin) {
      await supabase.from('families').update({ created_by: authData.user.id }).eq('id', familyId);
    }

    // Create profile
    const { error: profErr } = await supabase.from('profiles').insert({
      id: authData.user.id,
      family_id: familyId,
      display_name: displayName.trim(),
      role: persona,
      is_admin: isAdmin,
    });

    if (profErr) { setError(profErr.message); setLoading(false); return; }
    setLoading(false);
    // Auth state change will handle redirect
  };

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill all fields'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); }
    setLoading(false);
  };

  const [mode, setMode] = useState<'signup' | 'login'>('signup');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-sm w-full"
          >
            <motion.div
              className="text-6xl mb-6"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              🏠
            </motion.div>
            <h1 className="font-display text-3xl font-bold mb-2">Family Adda</h1>
            <p className="text-muted-foreground font-body mb-8">
              Your family's private digital veranda
            </p>
            <button
              onClick={() => setStep('create-or-join')}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-display font-semibold text-lg"
            >
              Enter the Adda
            </button>
          </motion.div>
        )}

        {step === 'create-or-join' && (
          <motion.div
            key="choice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-sm w-full space-y-4"
          >
            <h2 className="font-display text-2xl font-bold mb-6">How do you want to join?</h2>
            <button
              onClick={() => setStep('create')}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-display font-semibold"
            >
              🏡 Create a New Family
            </button>
            <button
              onClick={() => { setMode('signup'); setStep('join'); }}
              className="w-full py-4 rounded-lg bg-secondary text-secondary-foreground font-display font-semibold"
            >
              🔑 Join with Family Code
            </button>
            <button
              onClick={() => { setMode('login'); setStep('signup'); }}
              className="w-full py-3 rounded-lg text-muted-foreground font-body text-sm underline"
            >
              Already have an account? Log in
            </button>
          </motion.div>
        )}

        {step === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-sm w-full space-y-4"
          >
            <h2 className="font-display text-2xl font-bold">Name Your Family</h2>
            <p className="text-muted-foreground font-body text-sm">This will be your family's private space.</p>
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
            <button onClick={() => { setStep('create-or-join'); setError(''); }} className="w-full py-2 text-muted-foreground text-sm">
              ← Back
            </button>
          </motion.div>
        )}

        {step === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-sm w-full space-y-4"
          >
            <h2 className="font-display text-2xl font-bold">Enter Family Code</h2>
            <p className="text-muted-foreground font-body text-sm">Ask your family admin for the 6-digit code.</p>
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
              onClick={handleJoinFamily}
              disabled={loading || accessCode.length !== 6}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-display font-semibold disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Join Family'}
            </button>
            <button onClick={() => { setStep('create-or-join'); setError(''); }} className="w-full py-2 text-muted-foreground text-sm">
              ← Back
            </button>
          </motion.div>
        )}

        {step === 'persona' && (
          <motion.div
            key="persona"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-sm w-full space-y-4"
          >
            <h2 className="font-display text-2xl font-bold text-center">Who are you?</h2>
            <p className="text-muted-foreground font-body text-sm text-center">Pick your corner of the veranda</p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(PERSONA_CONFIG) as [PersonaRole, typeof PERSONA_CONFIG[PersonaRole]][]).map(([key, config]) => (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPersona(key as PersonaRole)}
                  className={`flex flex-col items-center py-6 rounded-xl border-2 transition-all font-display ${
                    persona === key
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-border bg-popover'
                  }`}
                >
                  <span className="text-4xl mb-2">{config.icon}</span>
                  <span className="font-semibold text-foreground">{config.label}</span>
                </motion.button>
              ))}
            </div>
            {isAdmin && accessCode && (
              <div className="bg-popover rounded-lg p-4 text-center border border-border">
                <p className="text-xs text-muted-foreground font-body mb-1">Your Family Code</p>
                <p className="font-display text-3xl font-bold tracking-widest text-foreground">{accessCode}</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Share this with family members!</p>
              </div>
            )}
            <button
              onClick={() => setStep('signup')}
              disabled={!persona}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-display font-semibold disabled:opacity-50"
            >
              Continue
            </button>
          </motion.div>
        )}

        {step === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-sm w-full space-y-4"
          >
            <h2 className="font-display text-2xl font-bold">
              {mode === 'login' ? 'Welcome Back' : 'Almost There!'}
            </h2>
            {mode === 'signup' && (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name (e.g., Rohan)"
                className="w-full py-3 px-4 rounded-lg bg-popover border border-border font-body text-foreground placeholder:text-muted-foreground"
                maxLength={30}
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full py-3 px-4 rounded-lg bg-popover border border-border font-body text-foreground placeholder:text-muted-foreground"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full py-3 px-4 rounded-lg bg-popover border border-border font-body text-foreground placeholder:text-muted-foreground"
            />
            {error && <p className="text-destructive text-sm font-body">{error}</p>}
            <button
              onClick={mode === 'login' ? handleLogin : handleSignUp}
              disabled={loading}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-display font-semibold disabled:opacity-50"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
            <button
              onClick={() => { 
                if (mode === 'login') { setStep('create-or-join'); } 
                else { setStep('persona'); }
                setError('');
              }}
              className="w-full py-2 text-muted-foreground text-sm"
            >
              ← Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
