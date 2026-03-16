import { useAuth } from '@/contexts/AuthContext';
import Gatekeeper from './Gatekeeper';
import AppShell from '@/components/AppShell';
import FamilyPicker from '@/components/FamilyPicker';

export default function Index() {
  const { user, profile, loading, memberships } = useAuth();

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

  // Not logged in
  if (!user) {
    return <Gatekeeper />;
  }

  // Logged in but no active family selected (or no memberships yet)
  if (!profile || memberships.length === 0) {
    return <FamilyPicker />;
  }

  // If user has multiple families but hasn't picked one, show picker
  // (profile being set means active family is selected)
  return <AppShell />;
}
