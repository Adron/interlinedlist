'use client';

import { useState } from 'react';
import { useFeed } from '@/contexts/FeedContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface PostEditorProps {
  replyToId?: string;
  onSuccess?: () => void;
}

export function PostEditor({ replyToId, onSuccess }: PostEditorProps) {
  const [content, setContent] = useState('');
  const [dslScript, setDslScript] = useState('');
  const [showDSL, setShowDSL] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addPost } = useFeed();
  const { user } = useAuth();
  const router = useRouter();

  const MAX_CONTENT_LENGTH = 10000;
  const remainingChars = MAX_CONTENT_LENGTH - content.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Post content cannot be empty');
      return;
    }

    if (!user) {
      setError('You must be logged in to post');
      return;
    }

    setLoading(true);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          content,
          dslScript: dslScript.trim() || undefined,
          replyToId: replyToId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create post');
      }

      const newPost = await response.json();
      addPost(newPost);
      setContent('');
      setDslScript('');
      setShowDSL(false);

      if (onSuccess) {
        onSuccess();
      } else if (replyToId) {
        router.push(`/posts/${replyToId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="p-4 border-b border-gray-200">
        <p className="text-gray-500 text-center">
          <a href="/login" className="text-indigo-600 hover:text-indigo-500">
            Log in
          </a>{' '}
          to create posts
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-b border-gray-200">
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mb-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={replyToId ? 'Write a reply...' : "What's happening?"}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          rows={4}
          maxLength={MAX_CONTENT_LENGTH}
        />
        <div className="flex justify-between items-center mt-1">
          <span
            className={`text-sm ${
              remainingChars < 100 ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {remainingChars} characters remaining
          </span>
          <button
            type="button"
            onClick={() => setShowDSL(!showDSL)}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {showDSL ? 'Hide' : 'Add'} DSL Script
          </button>
        </div>
      </div>

      {showDSL && (
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">
            DSL Script (optional)
          </label>
          <textarea
            value={dslScript}
            onChange={(e) => setDslScript(e.target.value)}
            placeholder="Enter DSL script here..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm resize-none"
            rows={6}
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Posting...' : replyToId ? 'Reply' : 'Post'}
        </button>
      </div>
    </form>
  );
}

