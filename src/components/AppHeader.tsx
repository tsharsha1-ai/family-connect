import { useAuth } from '@/contexts/AuthContext';
import { PERSONA_CONFIG } from '@/types/family';

export default function AppHeader() {
  const { profile, family } = useAuth();
  const personaConfig = profile?.role ? PERSONA_CONFIG[profile.role] : null;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {personaConfig && (
          <span className="text-xl" title={personaConfig.label}>
            {personaConfig.icon}
          </span>
        )}
        <h1 className="font-display font-bold text-lg text-foreground">
          {family?.name || 'Family Adda'}
        </h1>
      </div>
      {profile && (
        <span className="text-sm text-muted-foreground font-body">
          {profile.display_name}
        </span>
      )}
    </header>
  );
}
