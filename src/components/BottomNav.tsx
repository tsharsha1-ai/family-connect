import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Newspaper, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PERSONA_CONFIG } from '@/types/family';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/feed', icon: Newspaper, label: 'Feed' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Check if we're in a zone (not home, calendar, or settings)
  const isInZone = !['/', '/calendar', '/settings'].includes(location.pathname);
  if (isInZone) return null;

  const personaAccent = profile?.role
    ? `hsl(var(${PERSONA_CONFIG[profile.role].accentVar}))`
    : undefined;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-popover border-t border-border h-16 flex items-center justify-around z-50 safe-area-bottom">
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-0.5 py-2 px-4"
          >
            <Icon
              size={22}
              style={active && personaAccent ? { color: personaAccent } : undefined}
              className={active ? 'text-primary' : 'text-muted-foreground'}
            />
            <span
              className={`text-[10px] font-display font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
