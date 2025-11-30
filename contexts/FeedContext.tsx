'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Post, FeedResponse } from '@/types/post';
import { useAuth } from './AuthContext';

interface FeedContextType {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor?: string;
  loadFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  addPost: (post: Post) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  removePost: (postId: string) => void;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  unbookmarkPost: (postId: string) => Promise<void>;
  repost: (postId: string) => Promise<void>;
  unrepost: (postId: string) => Promise<void>;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const { user } = useAuth();

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch('/api/posts?limit=20', { headers });
      if (!response.ok) {
        throw new Error('Failed to load feed');
      }

      const data: FeedResponse = await response.json();
      setPosts(data.posts);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !nextCursor) return;

    setLoading(true);
    setError(null);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `/api/posts?limit=20&cursor=${nextCursor}`,
        { headers }
      );
      if (!response.ok) {
        throw new Error('Failed to load more posts');
      }

      const data: FeedResponse = await response.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more posts');
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, nextCursor]);

  const refreshFeed = useCallback(async () => {
    setNextCursor(undefined);
    setHasMore(true);
    await loadFeed();
  }, [loadFeed]);

  const addPost = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const updatePost = useCallback((postId: string, updates: Partial<Post>) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    );
  }, []);

  const removePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }, []);

  const likePost = useCallback(async (postId: string) => {
    if (!user) return;

    // Optimistic update
    updatePost(postId, {
      userInteractions: {
        liked: true,
        bookmarked: false,
        reposted: false,
      },
      _count: {
        likes: (posts.find((p) => p.id === postId)?._count?.likes || 0) + 1,
        bookmarks: posts.find((p) => p.id === postId)?._count?.bookmarks || 0,
        reposts: posts.find((p) => p.id === postId)?._count?.reposts || 0,
        replies: posts.find((p) => p.id === postId)?._count?.replies || 0,
      },
    });

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      const data = await response.json();
      updatePost(postId, {
        _count: {
          likes: data.likeCount,
          bookmarks: posts.find((p) => p.id === postId)?._count?.bookmarks || 0,
          reposts: posts.find((p) => p.id === postId)?._count?.reposts || 0,
          replies: posts.find((p) => p.id === postId)?._count?.replies || 0,
        },
      });
    } catch (err) {
      // Revert optimistic update
      updatePost(postId, {
        userInteractions: {
          liked: false,
          bookmarked: false,
          reposted: false,
        },
        _count: {
          likes: Math.max(
            0,
            (posts.find((p) => p.id === postId)?._count?.likes || 0) - 1
          ),
          bookmarks: posts.find((p) => p.id === postId)?._count?.bookmarks || 0,
          reposts: posts.find((p) => p.id === postId)?._count?.reposts || 0,
          replies: posts.find((p) => p.id === postId)?._count?.replies || 0,
        },
      });
    }
  }, [user, posts, updatePost]);

  const unlikePost = useCallback(async (postId: string) => {
    if (!user) return;

    // Optimistic update
    updatePost(postId, {
      userInteractions: {
        liked: false,
        bookmarked: false,
        reposted: false,
      },
      _count: {
        likes: Math.max(
          0,
          (posts.find((p) => p.id === postId)?._count?.likes || 0) - 1
        ),
        bookmarks: posts.find((p) => p.id === postId)?._count?.bookmarks || 0,
        reposts: posts.find((p) => p.id === postId)?._count?.reposts || 0,
        replies: posts.find((p) => p.id === postId)?._count?.replies || 0,
      },
    });

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to unlike post');
      }

      const data = await response.json();
      updatePost(postId, {
        _count: {
          likes: data.likeCount,
          bookmarks: posts.find((p) => p.id === postId)?._count?.bookmarks || 0,
          reposts: posts.find((p) => p.id === postId)?._count?.reposts || 0,
          replies: posts.find((p) => p.id === postId)?._count?.replies || 0,
        },
      });
    } catch (err) {
      // Revert optimistic update
      updatePost(postId, {
        userInteractions: {
          liked: true,
          bookmarked: false,
          reposted: false,
        },
        _count: {
          likes: (posts.find((p) => p.id === postId)?._count?.likes || 0) + 1,
          bookmarks: posts.find((p) => p.id === postId)?._count?.bookmarks || 0,
          reposts: posts.find((p) => p.id === postId)?._count?.reposts || 0,
          replies: posts.find((p) => p.id === postId)?._count?.replies || 0,
        },
      });
    }
  }, [user, posts, updatePost]);

  const bookmarkPost = useCallback(async (postId: string) => {
    if (!user) return;

    updatePost(postId, {
      userInteractions: {
        liked: posts.find((p) => p.id === postId)?.userInteractions?.liked || false,
        bookmarked: true,
        reposted: posts.find((p) => p.id === postId)?.userInteractions?.reposted || false,
      },
    });

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to bookmark post');
      }
    } catch (err) {
      updatePost(postId, {
        userInteractions: {
          liked: posts.find((p) => p.id === postId)?.userInteractions?.liked || false,
          bookmarked: false,
          reposted: posts.find((p) => p.id === postId)?.userInteractions?.reposted || false,
        },
      });
    }
  }, [user, posts, updatePost]);

  const unbookmarkPost = useCallback(async (postId: string) => {
    if (!user) return;

    updatePost(postId, {
      userInteractions: {
        liked: posts.find((p) => p.id === postId)?.userInteractions?.liked || false,
        bookmarked: false,
        reposted: posts.find((p) => p.id === postId)?.userInteractions?.reposted || false,
      },
    });

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/posts/${postId}/bookmark`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to unbookmark post');
      }
    } catch (err) {
      updatePost(postId, {
        userInteractions: {
          liked: posts.find((p) => p.id === postId)?.userInteractions?.liked || false,
          bookmarked: true,
          reposted: posts.find((p) => p.id === postId)?.userInteractions?.reposted || false,
        },
      });
    }
  }, [user, posts, updatePost]);

  const repost = useCallback(async (postId: string) => {
    if (!user) return;

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/posts/${postId}/repost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to repost');
      }

      const newPost: Post = await response.json();
      addPost(newPost);
      updatePost(postId, {
        userInteractions: {
          liked: posts.find((p) => p.id === postId)?.userInteractions?.liked || false,
          bookmarked: posts.find((p) => p.id === postId)?.userInteractions?.bookmarked || false,
          reposted: true,
        },
        _count: {
          likes: posts.find((p) => p.id === postId)?._count?.likes || 0,
          bookmarks: posts.find((p) => p.id === postId)?._count?.bookmarks || 0,
          reposts: (posts.find((p) => p.id === postId)?._count?.reposts || 0) + 1,
          replies: posts.find((p) => p.id === postId)?._count?.replies || 0,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to repost');
    }
  }, [user, posts, addPost, updatePost]);

  const unrepost = useCallback(async (postId: string) => {
    if (!user) return;

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/posts/${postId}/repost`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to unrepost');
      }

      // Remove repost from feed
      setPosts((prev) => prev.filter((p) => !(p.repostOfId === postId && p.userId === user.id)));
      updatePost(postId, {
        userInteractions: {
          liked: posts.find((p) => p.id === postId)?.userInteractions?.liked || false,
          bookmarked: posts.find((p) => p.id === postId)?.userInteractions?.bookmarked || false,
          reposted: false,
        },
        _count: {
          likes: posts.find((p) => p.id === postId)?._count?.likes || 0,
          bookmarks: posts.find((p) => p.id === postId)?._count?.bookmarks || 0,
          reposts: Math.max(
            0,
            (posts.find((p) => p.id === postId)?._count?.reposts || 0) - 1
          ),
          replies: posts.find((p) => p.id === postId)?._count?.replies || 0,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unrepost');
    }
  }, [user, posts, updatePost]);

  return (
    <FeedContext.Provider
      value={{
        posts,
        loading,
        error,
        hasMore,
        nextCursor,
        loadFeed,
        loadMore,
        refreshFeed,
        addPost,
        updatePost,
        removePost,
        likePost,
        unlikePost,
        bookmarkPost,
        unbookmarkPost,
        repost,
        unrepost,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const context = useContext(FeedContext);
  if (context === undefined) {
    throw new Error('useFeed must be used within a FeedProvider');
  }
  return context;
}

