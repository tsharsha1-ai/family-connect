import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle, Plus, Send, X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PostWithMeta {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string;
}

export default function StyleZone() {
  const navigate = useNavigate();
  const { user, profile, family } = useAuth();
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comments state
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!family?.id || !user?.id) return;

    const { data: postsData, error } = await supabase
      .from('style_posts')
      .select('*')
      .eq('family_id', family.id)
      .order('created_at', { ascending: false });

    if (error || !postsData) {
      setLoading(false);
      return;
    }

    // Fetch profiles, likes, comments counts
    const userIds = [...new Set(postsData.map(p => p.user_id))];
    const postIds = postsData.map(p => p.id);

    const [profilesRes, likesRes, myLikesRes, commentsRes] = await Promise.all([
      supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds),
      supabase.from('style_likes').select('post_id').in('post_id', postIds),
      supabase.from('style_likes').select('post_id').in('post_id', postIds).eq('user_id', user.id),
      supabase.from('style_comments').select('post_id').in('post_id', postIds),
    ]);

    const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) ?? []);
    const likeCounts = new Map<string, number>();
    likesRes.data?.forEach(l => likeCounts.set(l.post_id, (likeCounts.get(l.post_id) || 0) + 1));
    const myLikes = new Set(myLikesRes.data?.map(l => l.post_id) ?? []);
    const commentCounts = new Map<string, number>();
    commentsRes.data?.forEach(c => commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1));

    setPosts(postsData.map(p => {
      const prof = profileMap.get(p.user_id);
      return {
        id: p.id,
        user_id: p.user_id,
        image_url: p.image_url,
        caption: p.caption,
        created_at: p.created_at,
        display_name: prof?.display_name || 'Unknown',
        avatar_url: (prof as any)?.avatar_url || null,
        like_count: likeCounts.get(p.id) || 0,
        comment_count: commentCounts.get(p.id) || 0,
        liked_by_me: myLikes.has(p.id),
      };
    }));
    setLoading(false);
  }, [family?.id, user?.id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) }
        : p
    ));

    if (post.liked_by_me) {
      await supabase.from('style_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('style_likes').insert({ post_id: postId, user_id: user.id });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowNewPost(true);
  };

  const submitPost = async () => {
    if (!selectedFile || !user || !family) return;
    setUploading(true);
    try {
      // Resize image client-side to reduce upload size
      const resizedFile = await resizeImage(selectedFile, 1200);
      const ext = 'jpeg';
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('style-images')
        .upload(filePath, resizedFile, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('style-images')
        .getPublicUrl(filePath);

      const { error: insertErr } = await supabase.from('style_posts').insert({
        user_id: user.id,
        family_id: family.id,
        image_url: publicUrl,
        caption: caption || null,
      });
      if (insertErr) throw insertErr;

      toast.success('Posted! ✨');
      setShowNewPost(false);
      setCaption('');
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchPosts();
    } catch (err: any) {
      console.error('Post upload error:', err);
      toast.error(err.message || 'Failed to post');
    } finally {
      setUploading(false);
    }
  };

  const resizeImage = (file: File, maxDim: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = (height / width) * maxDim; width = maxDim; }
          else { width = (width / height) * maxDim; height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Failed to compress image')),
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const deletePost = async (postId: string) => {
    if (!user) return;
    await supabase.from('style_posts').delete().eq('id', postId).eq('user_id', user.id);
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast.success('Post deleted');
  };

  // Comments
  const openCommentsPanel = async (postId: string) => {
    setOpenComments(postId);
    setLoadingComments(true);
    const { data } = await supabase
      .from('style_comments')
      .select('id, content, created_at, user_id')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
      const nameMap = new Map(profiles?.map(p => [p.id, p.display_name]) ?? []);
      setComments(data.map(c => ({ ...c, display_name: nameMap.get(c.user_id) || 'Unknown' })));
    } else {
      setComments([]);
    }
    setLoadingComments(false);
  };

  const submitComment = async () => {
    if (!newComment.trim() || !openComments || !user) return;
    const { error } = await supabase.from('style_comments').insert({
      post_id: openComments,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (error) { toast.error('Failed to comment'); return; }

    setComments(prev => [...prev, {
      id: crypto.randomUUID(),
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      user_id: user.id,
      display_name: profile?.display_name || 'You',
    }]);
    setPosts(prev => prev.map(p =>
      p.id === openComments ? { ...p, comment_count: p.comment_count + 1 } : p
    ));
    setNewComment('');
  };

  return (
    <motion.div layoutId="zone-style" className="min-h-screen bg-style-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-style/30 border-b border-style sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1">
            <ArrowLeft size={22} className="text-style-accent" />
          </button>
          <h1 className="font-display font-bold text-xl text-style-accent">✨ Style Circle</h1>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 bg-primary rounded-full"
        >
          <Plus size={18} className="text-primary-foreground" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Posts Feed */}
      <div className="overflow-y-auto pb-20" style={{ height: 'calc(100vh - 3.5rem)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-style-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-4xl mb-3">✨</p>
            <p className="font-display font-bold text-lg text-foreground">No posts yet!</p>
            <p className="text-sm text-muted-foreground font-body mt-1">Tap + to share your first style</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="border-b border-style/50">
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {post.avatar_url ? (
                    <img src={post.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-style/50 flex items-center justify-center text-xs">🌸</div>
                  )}
                  <span className="font-display font-semibold text-sm text-style-accent">{post.display_name}</span>
                </div>
                {post.user_id === user?.id && (
                  <button onClick={() => deletePost(post.id)} className="p-1 text-muted-foreground">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <img src={post.image_url} alt={post.caption || ''} className="w-full aspect-square object-cover" />
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1">
                    <Heart
                      size={22}
                      className={post.liked_by_me ? 'fill-kids-accent text-kids-accent' : 'text-style-accent'}
                    />
                    <span className="text-sm font-body text-style-accent">{post.like_count}</span>
                  </button>
                  <button onClick={() => openCommentsPanel(post.id)} className="flex items-center gap-1">
                    <MessageCircle size={20} className="text-style-accent" />
                    <span className="text-sm font-body text-style-accent">{post.comment_count}</span>
                  </button>
                </div>
                {post.caption && (
                  <p className="font-body text-sm text-foreground">
                    <span className="font-semibold">{post.display_name}</span>{' '}{post.caption}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Post Dialog */}
      <AnimatePresence>
        {showNewPost && previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <button onClick={() => { setShowNewPost(false); setSelectedFile(null); setPreviewUrl(null); setCaption(''); }}>
                <X size={24} className="text-foreground" />
              </button>
              <h2 className="font-display font-bold text-foreground">New Post</h2>
              <button
                onClick={submitPost}
                disabled={uploading}
                className="font-display font-bold text-primary disabled:opacity-50"
              >
                {uploading ? 'Posting...' : 'Share'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <img src={previewUrl} alt="Preview" className="w-full aspect-square object-cover rounded-xl" />
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full bg-muted rounded-xl p-3 text-sm font-body text-foreground placeholder:text-muted-foreground resize-none h-20 border-none outline-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Panel */}
      <AnimatePresence>
        {openComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-display font-bold text-foreground">Comments</h2>
              <button onClick={() => setOpenComments(null)}>
                <X size={24} className="text-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-style-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-muted-foreground font-body text-sm py-8">No comments yet</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="space-y-0.5">
                    <p className="font-body text-sm text-foreground">
                      <span className="font-semibold">{c.display_name}</span>{' '}{c.content}
                    </p>
                    <p className="text-xs text-muted-foreground font-body">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t border-border flex items-center gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground border-none outline-none"
              />
              <button onClick={submitComment} disabled={!newComment.trim()} className="p-2 text-primary disabled:opacity-30">
                <Send size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
