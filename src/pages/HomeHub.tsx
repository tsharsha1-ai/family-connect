import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const ZONES = [
  {
    id: 'kids',
    title: 'Kids Zone',
    subtitle: 'Play & Learn',
    emoji: '🎮',
    path: '/zone/kids',
    bgClass: 'bg-kids-bg',
    borderClass: 'border-kids',
    textClass: 'text-foreground',
  },
  {
    id: 'arena',
    title: 'IPL Arena',
    subtitle: 'Predict & Win',
    emoji: '🏏',
    path: '/zone/arena',
    bgClass: 'bg-arena',
    borderClass: 'border-arena-accent',
    textClass: 'text-arena-accent',
  },
  {
    id: 'style',
    title: 'Style Circle',
    subtitle: 'Share & Inspire',
    emoji: '✨',
    path: '/zone/style',
    bgClass: 'bg-style-bg',
    borderClass: 'border-style',
    textClass: 'text-style-accent',
  },
  {
    id: 'wisdom',
    title: 'Wisdom Well',
    subtitle: 'Bless & Connect',
    emoji: '🪷',
    path: '/zone/wisdom',
    bgClass: 'bg-wisdom-bg',
    borderClass: 'border-wisdom',
    textClass: 'text-wisdom-accent',
  },
];

export default function HomeHub() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 p-3 grid grid-cols-2 grid-rows-2 gap-3 pb-20">
      {ZONES.map((zone, i) => (
        <motion.button
          key={zone.id}
          layoutId={`zone-${zone.id}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate(zone.path)}
          className={`${zone.bgClass} rounded-2xl border-2 ${zone.borderClass} flex flex-col items-center justify-center gap-1.5 shadow-md hover:shadow-lg active:shadow-none transition-all`}
        >
          <span className="text-3xl">{zone.emoji}</span>
          <span className={`font-display font-bold text-sm ${zone.textClass}`}>{zone.title}</span>
          <span className="text-[11px] text-muted-foreground font-body">{zone.subtitle}</span>
        </motion.button>
      ))}
    </div>
  );
}
