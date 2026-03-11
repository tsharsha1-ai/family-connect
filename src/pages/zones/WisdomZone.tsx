import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SAMPLE_BLESSINGS = [
  { id: '1', author: 'Dadi', text: 'May God bless this family with health and happiness always. 🙏', time: 'Today' },
  { id: '2', author: 'Nana', text: 'Remember: family is not important, it is everything. ❤️', time: 'Yesterday' },
];

export default function WisdomZone() {
  const navigate = useNavigate();
  const [blessing, setBlessing] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?\s]+)/);
    return match?.[1] || null;
  };

  const ytId = getYouTubeId(videoUrl);

  return (
    <motion.div layoutId="zone-wisdom" className="min-h-screen bg-wisdom-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-wisdom/50 border-b border-wisdom">
        <button onClick={() => navigate('/')} className="p-1">
          <ArrowLeft size={24} className="text-wisdom-accent" />
        </button>
        <h1 className="font-display font-bold text-xl text-wisdom-accent">🪷 Wisdom Well</h1>
      </div>

      <div className="zone-scroll zone-scroll-wisdom overflow-y-auto p-4 space-y-6" style={{ height: 'calc(100vh - 3.5rem)' }}>
        {/* Daily Blessing Input */}
        <div className="space-y-3">
          <h2 className="font-display font-bold text-wisdom-accent" style={{ fontSize: '22px' }}>
            Share a Blessing
          </h2>
          <div className="flex gap-2">
            <textarea
              value={blessing}
              onChange={(e) => setBlessing(e.target.value)}
              placeholder="Write your daily blessing..."
              className="flex-1 p-4 rounded-xl bg-popover border-2 border-wisdom font-body text-foreground placeholder:text-muted-foreground resize-none"
              style={{ fontSize: '20px', minHeight: '100px' }}
              maxLength={300}
            />
          </div>
          <button className="w-full py-4 bg-wisdom-accent text-primary-foreground rounded-xl font-display font-bold flex items-center justify-center gap-2" style={{ fontSize: '18px' }}>
            <Send size={20} /> Send Blessing
          </button>
        </div>

        {/* Blessings Feed */}
        <div className="space-y-3">
          <h2 className="font-display font-bold text-wisdom-accent" style={{ fontSize: '22px' }}>
            Blessings
          </h2>
          {SAMPLE_BLESSINGS.map(b => (
            <div key={b.id} className="bg-popover rounded-xl p-4 border-2 border-wisdom">
              <div className="flex justify-between items-center mb-2">
                <span className="font-display font-bold text-wisdom-accent" style={{ fontSize: '18px' }}>{b.author}</span>
                <span className="text-muted-foreground font-body text-sm">{b.time}</span>
              </div>
              <p className="font-body text-foreground" style={{ fontSize: '20px', lineHeight: 1.6 }}>{b.text}</p>
            </div>
          ))}
        </div>

        {/* Devotional Video */}
        <div className="space-y-3">
          <h2 className="font-display font-bold text-wisdom-accent" style={{ fontSize: '22px' }}>
            Devotional Songs
          </h2>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste YouTube link here..."
            className="w-full p-4 rounded-xl bg-popover border-2 border-wisdom font-body text-foreground placeholder:text-muted-foreground"
            style={{ fontSize: '18px' }}
          />
          {ytId && (
            <div className="rounded-xl overflow-hidden border-2 border-wisdom">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowFullScreen
                title="Devotional Video"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
