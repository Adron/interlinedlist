'use client';

import Link from 'next/link';
import { formatTimestamp } from '@/lib/posts/formatting';
import type { Post } from '@/types/post';
import { PostActions } from './PostActions';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const displayPost = post.repostOf || post;
  const displayUser = displayPost.user;

  return (
    <article className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors">
      {post.repostOf && (
        <div className="text-sm text-gray-500 mb-2">
          <span className="font-medium">{post.user?.displayName || post.user?.username}</span> reposted
        </div>
      )}

      <div className="flex gap-3">
        <Link href={`/users/${displayUser?.username || ''}`}>
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
            {displayUser?.avatarUrl ? (
              <img
                src={displayUser.avatarUrl}
                alt={displayUser.displayName || displayUser.username}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <span className="text-gray-600 font-medium">
                {(displayUser?.displayName || displayUser?.username || 'U')[0].toUpperCase()}
              </span>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/users/${displayUser?.username || ''}`}
              className="font-semibold hover:underline"
            >
              {displayUser?.displayName || displayUser?.username}
            </Link>
            <Link
              href={`/users/${displayUser?.username || ''}`}
              className="text-gray-500 text-sm hover:underline"
            >
              @{displayUser?.username}
            </Link>
            <span className="text-gray-500 text-sm">·</span>
            <Link
              href={`/posts/${displayPost.id}`}
              className="text-gray-500 text-sm hover:underline"
            >
              {formatTimestamp(new Date(displayPost.createdAt))}
            </Link>
          </div>

          {displayPost.replyToId && (
            <div className="text-sm text-gray-500 mb-2">
              Replying to{' '}
              <Link
                href={`/posts/${displayPost.replyToId}`}
                className="text-indigo-600 hover:text-indigo-500"
              >
                @{displayPost.replyTo?.user?.username || 'user'}
              </Link>
            </div>
          )}

          <div className="mb-3 whitespace-pre-wrap break-words">
            {displayPost.content}
          </div>

          {displayPost.dslScript && (
            <div className="mb-3 p-3 bg-gray-100 rounded text-sm font-mono text-gray-700">
              <div className="font-semibold mb-1">DSL Script:</div>
              <pre className="whitespace-pre-wrap break-words">
                {displayPost.dslScript}
              </pre>
            </div>
          )}

          <PostActions post={displayPost} />
        </div>
      </div>
    </article>
  );
}

