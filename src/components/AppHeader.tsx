import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PERSONA_CONFIG } from '@/types/family';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function AppHeader() {
  const { profile, family, memberships, setActiveFamily } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const personaConfig = profile?.role ? PERSONA_CONFIG[profile.role] : null;
  const hasMultipleFamilies = memberships.length > 1;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 relative">
        {personaConfig && (
          <span className="text-xl" title={personaConfig.label}>
            {personaConfig.icon}
          </span>
        )}
        <button
          onClick={() => hasMultipleFamilies && setShowSwitcher(!showSwitcher)}
          className="flex items-center gap-1"
        >
          <h1 className="font-display font-bold text-lg text-foreground">
            {family?.name || 'Family Adda'}
          </h1>
          {hasMultipleFamilies && (
            <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
          )}
        </button>

        {/* Family Switcher Dropdown */}
        <AnimatePresence>
          {showSwitcher && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50"
            >
              {memberships.map((m) => {
                const config = PERSONA_CONFIG[m.role];
                const isActive = m.family_id === profile?.family_id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveFamily(m.family_id);
                      setShowSwitcher(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isActive ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="text-xl">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-sm text-foreground truncate">
                        {m.family.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-body">
                        {m.display_name}
                      </p>
                    </div>
                    {isActive && (
                      <span className="text-xs text-primary font-display font-semibold">Active</span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {profile && (
        <span className="text-sm text-muted-foreground font-body">
          {profile.display_name}
        </span>
      )}
    </header>
  );
}
