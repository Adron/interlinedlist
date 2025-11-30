'use client';

import { useFeed } from '@/contexts/FeedContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Post } from '@/types/post';
import Link from 'next/link';

interface PostActionsProps {
  post: Post;
}

export function PostActions({ post }: PostActionsProps) {
  const { likePost, unlikePost, bookmarkPost, unbookmarkPost, repost, unrepost } = useFeed();
  const { user } = useAuth();

  const handleLike = () => {
    if (post.userInteractions?.liked) {
      unlikePost(post.id);
    } else {
      likePost(post.id);
    }
  };

  const handleBookmark = () => {
    if (post.userInteractions?.bookmarked) {
      unbookmarkPost(post.id);
    } else {
      bookmarkPost(post.id);
    }
  };

  const handleRepost = () => {
    if (post.userInteractions?.reposted) {
      unrepost(post.id);
    } else {
      repost(post.id);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      // Could show a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center gap-6 text-gray-500 text-sm">
        <span>{post._count?.likes || 0} likes</span>
        <span>{post._count?.reposts || 0} reposts</span>
        <span>{post._count?.replies || 0} replies</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 text-gray-500">
      <Link
        href={`/posts/${post.id}`}
        className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="text-sm">{post._count?.replies || 0}</span>
      </Link>

      <button
        onClick={handleRepost}
        className={`flex items-center gap-2 hover:text-indigo-600 transition-colors ${
          post.userInteractions?.reposted ? 'text-indigo-600' : ''
        }`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="text-sm">{post._count?.reposts || 0}</span>
      </button>

      <button
        onClick={handleLike}
        className={`flex items-center gap-2 hover:text-red-600 transition-colors ${
          post.userInteractions?.liked ? 'text-red-600' : ''
        }`}
      >
        {post.userInteractions?.liked ? (
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        )}
        <span className="text-sm">{post._count?.likes || 0}</span>
      </button>

      <button
        onClick={handleBookmark}
        className={`flex items-center gap-2 hover:text-indigo-600 transition-colors ${
          post.userInteractions?.bookmarked ? 'text-indigo-600' : ''
        }`}
      >
        {post.userInteractions?.bookmarked ? (
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        )}
      </button>

      <button
        onClick={handleShare}
        className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      </button>
    </div>
  );
}

