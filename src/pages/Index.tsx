import { useAuth } from '@/contexts/AuthContext';
import Gatekeeper from './Gatekeeper';
import AppShell from '@/components/AppShell';

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🏠</div>
          <p className="font-display text-muted-foreground">Loading Family Adda...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Gatekeeper />;
  }

  return <AppShell />;
}
