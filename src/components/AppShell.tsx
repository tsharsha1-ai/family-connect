import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import HomeHub from '@/pages/HomeHub';
import { useLocation } from 'react-router-dom';

// Lazy-load heavy zone pages — only downloaded when visited
const FamilyCalendar = lazy(() => import('@/pages/FamilyCalendar'));
const FamilyFeed = lazy(() => import('@/pages/FamilyFeed'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const KidsZone = lazy(() => import('@/pages/zones/KidsZone'));
const ArenaZone = lazy(() => import('@/pages/zones/ArenaZone'));
const StyleZone = lazy(() => import('@/pages/zones/StyleZone'));
const WisdomZone = lazy(() => import('@/pages/zones/WisdomZone'));

const ZoneLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function AppShell() {
  const location = useLocation();
  const isInZone = location.pathname.startsWith('/zone/');

  if (isInZone) {
    return (
      <Suspense fallback={<ZoneLoader />}>
        <Routes>
          <Route path="/zone/kids" element={<KidsZone />} />
          <Route path="/zone/arena" element={<ArenaZone />} />
          <Route path="/zone/style" element={<StyleZone />} />
          <Route path="/zone/wisdom" element={<WisdomZone />} />
        </Routes>
      </Suspense>
    );
  }

  const isHome = location.pathname === '/';

  return (
    <div className={`flex flex-col min-h-screen ${isHome ? 'bg-gradient-to-b from-[hsl(var(--shell-from))] to-[hsl(var(--shell-to))]' : 'bg-background'}`}>
      <AppHeader isHome={isHome} />
      <Suspense fallback={<ZoneLoader />}>
        <Routes>
          <Route path="/" element={<HomeHub />} />
          <Route path="/calendar" element={<FamilyCalendar />} />
          <Route path="/feed" element={<FamilyFeed />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>
      <BottomNav />
    </div>
  );
}
