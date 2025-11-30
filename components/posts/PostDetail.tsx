'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatTimestamp } from '@/lib/posts/formatting';
import type { Post } from '@/types/post';
import { PostActions } from './PostActions';
import { PostEditor } from './PostEditor';
import { ReplyThread } from './ReplyThread';

export function PostDetail() {
  const params = useParams();
  const postId = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPost() {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch(`/api/posts/${postId}`, { headers });
        if (!response.ok) {
          throw new Error('Failed to load post');
        }

        const data = await response.json();
        setPost(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    }

    if (postId) {
      loadPost();
    }
  }, [postId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-4">{error || 'Post not found'}</p>
        <Link
          href="/"
          className="text-indigo-600 hover:text-indigo-500 underline"
        >
          Back to feed
        </Link>
      </div>
    );
  }

  const displayPost = post.repostOf || post;
  const displayUser = displayPost.user;

  return (
    <div>
      <div className="border-b border-gray-200 p-6">
        {post.repostOf && (
          <div className="text-sm text-gray-500 mb-4">
            <span className="font-medium">{post.user?.displayName || post.user?.username}</span> reposted
          </div>
        )}

        <div className="flex gap-4">
          <Link href={`/users/${displayUser?.username || ''}`}>
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
              {displayUser?.avatarUrl ? (
                <img
                  src={displayUser.avatarUrl}
                  alt={displayUser.displayName || displayUser.username}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <span className="text-gray-600 font-medium text-lg">
                  {(displayUser?.displayName || displayUser?.username || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>
          </Link>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={`/users/${displayUser?.username || ''}`}
                className="font-semibold text-lg hover:underline"
              >
                {displayUser?.displayName || displayUser?.username}
              </Link>
              <Link
                href={`/users/${displayUser?.username || ''}`}
                className="text-gray-500 hover:underline"
              >
                @{displayUser?.username}
              </Link>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500">
                {formatTimestamp(new Date(displayPost.createdAt))}
              </span>
            </div>

            <div className="mb-4 whitespace-pre-wrap break-words text-lg">
              {displayPost.content}
            </div>

            {displayPost.dslScript && (
              <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                <div className="font-semibold mb-2">DSL Script:</div>
                <pre className="whitespace-pre-wrap break-words font-mono text-sm">
                  {displayPost.dslScript}
                </pre>
              </div>
            )}

            <PostActions post={displayPost} />
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <PostEditor replyToId={displayPost.id} />
      </div>

      <ReplyThread postId={displayPost.id} />
    </div>
  );
}

