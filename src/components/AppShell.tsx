import { Routes, Route } from 'react-router-dom';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import HomeHub from '@/pages/HomeHub';
import FamilyCalendar from '@/pages/FamilyCalendar';
import SettingsPage from '@/pages/SettingsPage';
import KidsZone from '@/pages/zones/KidsZone';
import ArenaZone from '@/pages/zones/ArenaZone';
import StyleZone from '@/pages/zones/StyleZone';
import WisdomZone from '@/pages/zones/WisdomZone';
import { useLocation } from 'react-router-dom';

export default function AppShell() {
  const location = useLocation();
  const isInZone = location.pathname.startsWith('/zone/');

  if (isInZone) {
    return (
      <Routes>
        <Route path="/zone/kids" element={<KidsZone />} />
        <Route path="/zone/arena" element={<ArenaZone />} />
        <Route path="/zone/style" element={<StyleZone />} />
        <Route path="/zone/wisdom" element={<WisdomZone />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <Routes>
        <Route path="/" element={<HomeHub />} />
        <Route path="/calendar" element={<FamilyCalendar />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
