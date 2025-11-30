'use client';

import { FeedProvider } from '@/contexts/FeedContext';
import { PostDetail } from '@/components/posts/PostDetail';
import Link from 'next/link';

export default function PostDetailPage() {
  return (
    <FeedProvider>
      <main className="max-w-2xl mx-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="p-4 flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold">Post</h1>
          </div>
        </div>
        <PostDetail />
      </main>
    </FeedProvider>
  );
}

