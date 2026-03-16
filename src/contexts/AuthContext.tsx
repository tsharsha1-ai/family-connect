import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Family, FamilyMember, PersonaRole } from '@/types/family';

/** Profile-shaped object for backward compat with existing components */
interface ProfileCompat {
  id: string;
  family_id: string;
  display_name: string;
  role: PersonaRole;
  is_admin: boolean;
  avatar_url?: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  /** Active membership mapped to legacy Profile shape */
  profile: ProfileCompat | null;
  /** Active family */
  family: Family | null;
  /** All families the user belongs to */
  memberships: (FamilyMember & { family: Family })[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setActiveFamily: (familyId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_FAMILY_KEY = 'family_adda_active_family';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<(FamilyMember & { family: Family })[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_FAMILY_KEY)
  );
  const [loading, setLoading] = useState(true);

  const fetchMemberships = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('family_members')
      .select('*, family:families(*)')
      .eq('user_id', userId);

    if (error) {
      console.error('Fetch memberships:', error);
      setMemberships([]);
      return;
    }

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      family_id: row.family_id,
      display_name: row.display_name,
      role: row.role as PersonaRole,
      is_admin: row.is_admin,
      avatar_url: row.avatar_url,
      created_at: row.created_at,
      family: row.family as Family,
    }));

    setMemberships(mapped);

    // Auto-select active family if none set or invalid
    const stored = localStorage.getItem(ACTIVE_FAMILY_KEY);
    if (mapped.length > 0 && (!stored || !mapped.find(m => m.family_id === stored))) {
      const firstId = mapped[0].family_id;
      localStorage.setItem(ACTIVE_FAMILY_KEY, firstId);
      setActiveFamilyId(firstId);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchMemberships(user.id);
  }, [user, fetchMemberships]);

  const setActiveFamily = useCallback((familyId: string) => {
    localStorage.setItem(ACTIVE_FAMILY_KEY, familyId);
    setActiveFamilyId(familyId);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        try { await fetchMemberships(currentUser.id); } catch (e) { console.error('Memberships fetch:', e); }
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchMemberships(currentUser.id).catch(console.error);
        } else {
          setMemberships([]);
          setActiveFamilyId(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchMemberships]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMemberships([]);
    setActiveFamilyId(null);
    localStorage.removeItem(ACTIVE_FAMILY_KEY);
  };

  // Derive active membership & family
  const activeMembership = memberships.find(m => m.family_id === activeFamilyId) ?? null;

  const profile: ProfileCompat | null = activeMembership
    ? {
        id: activeMembership.user_id,
        family_id: activeMembership.family_id,
        display_name: activeMembership.display_name,
        role: activeMembership.role,
        is_admin: activeMembership.is_admin,
        avatar_url: activeMembership.avatar_url,
        created_at: activeMembership.created_at,
      }
    : null;

  const family = activeMembership?.family ?? null;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      family,
      memberships,
      loading,
      signOut,
      refreshProfile,
      setActiveFamily,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
