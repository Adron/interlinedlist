'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatTimestamp } from '@/lib/posts/formatting';
import type { Post } from '@/types/post';
import { PostActions } from './PostActions';

interface ReplyThreadProps {
  postId: string;
}

export function ReplyThread({ postId }: ReplyThreadProps) {
  const [replies, setReplies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  useEffect(() => {
    loadReplies();
  }, [postId]);

  async function loadReplies() {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const url = nextCursor
        ? `/api/posts/${postId}/replies?cursor=${nextCursor}`
        : `/api/posts/${postId}/replies`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error('Failed to load replies');
      }

      const data = await response.json();
      setReplies((prev) => [...prev, ...data.replies]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Failed to load replies:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && replies.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
        Loading replies...
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No replies yet. Be the first to reply!
      </div>
    );
  }

  return (
    <div>
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold">Replies ({replies.length})</h2>
      </div>
      {replies.map((reply) => (
        <article
          key={reply.id}
          className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex gap-3">
            <Link href={`/users/${reply.user?.username || ''}`}>
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                {reply.user?.avatarUrl ? (
                  <img
                    src={reply.user.avatarUrl}
                    alt={reply.user.displayName || reply.user.username}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <span className="text-gray-600 font-medium">
                    {(reply.user?.displayName || reply.user?.username || 'U')[0].toUpperCase()}
                  </span>
                )}
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/users/${reply.user?.username || ''}`}
                  className="font-semibold hover:underline"
                >
                  {reply.user?.displayName || reply.user?.username}
                </Link>
                <Link
                  href={`/users/${reply.user?.username || ''}`}
                  className="text-gray-500 text-sm hover:underline"
                >
                  @{reply.user?.username}
                </Link>
                <span className="text-gray-500 text-sm">·</span>
                <Link
                  href={`/posts/${reply.id}`}
                  className="text-gray-500 text-sm hover:underline"
                >
                  {formatTimestamp(new Date(reply.createdAt))}
                </Link>
              </div>

              <div className="mb-3 whitespace-pre-wrap break-words">
                {reply.content}
              </div>

              <PostActions post={reply} />
            </div>
          </div>
        </article>
      ))}

      {hasMore && (
        <div className="p-4 text-center">
          <button
            onClick={loadReplies}
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            Load more replies
          </button>
        </div>
      )}
    </div>
  );
}

