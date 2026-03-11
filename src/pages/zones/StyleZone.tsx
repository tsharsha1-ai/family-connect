import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PLACEHOLDER_POSTS = [
  {
    id: '1',
    user: 'Priya',
    caption: 'New saree for the wedding season! 💃',
    likes: 5,
    comments: 2,
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop',
  },
  {
    id: '2',
    user: 'Meera',
    caption: 'Traditional meets modern 🌸',
    likes: 8,
    comments: 4,
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=400&fit=crop',
  },
];

export default function StyleZone() {
  const navigate = useNavigate();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const toggleLike = (id: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <motion.div layoutId="zone-style" className="min-h-screen bg-style-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-style/30 border-b border-style">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1">
            <ArrowLeft size={22} className="text-style-accent" />
          </button>
          <h1 className="font-display font-bold text-xl text-style-accent">✨ Style Circle</h1>
        </div>
        <button className="p-2 bg-primary rounded-full">
          <Plus size={18} className="text-primary-foreground" />
        </button>
      </div>

      <div className="zone-scroll zone-scroll-style overflow-y-auto pb-20" style={{ height: 'calc(100vh - 3.5rem)' }}>
        {PLACEHOLDER_POSTS.map(post => (
          <div key={post.id} className="border-b border-style/50">
            <div className="px-4 py-2">
              <span className="font-display font-semibold text-sm text-style-accent">{post.user}</span>
            </div>
            <img src={post.image} alt={post.caption} className="w-full aspect-square object-cover" />
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1">
                  <Heart
                    size={22}
                    className={likedPosts.has(post.id) ? 'fill-kids-accent text-kids-accent' : 'text-style-accent'}
                  />
                  <span className="text-sm font-body text-style-accent">
                    {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                  </span>
                </button>
                <button className="flex items-center gap-1">
                  <MessageCircle size={20} className="text-style-accent" />
                  <span className="text-sm font-body text-style-accent">{post.comments}</span>
                </button>
              </div>
              <p className="font-body text-sm text-foreground">
                <span className="font-semibold">{post.user}</span>{' '}{post.caption}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
