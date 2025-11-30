'use client';

import { useEffect, useRef } from 'react';
import { useFeed } from '@/contexts/FeedContext';
import { PostCard } from './PostCard';

export function PostFeed() {
  const { posts, loading, error, hasMore, loadFeed, loadMore } = useFeed();
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadMore]);

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadFeed}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <p className="text-lg mb-2">No posts yet</p>
        <p className="text-sm">Be the first to post!</p>
      </div>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {loading && posts.length > 0 && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {hasMore && (
        <div ref={observerTarget} className="h-4"></div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="p-8 text-center text-gray-500 text-sm">
          No more posts to load
        </div>
      )}
    </div>
  );
}

