'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FeedProvider } from '@/contexts/FeedContext';
import { PostFeed } from '@/components/posts/PostFeed';
import { PostEditor } from '@/components/posts/PostEditor';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </main>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <FeedProvider>
      <main className="max-w-2xl mx-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="p-4">
            <h1 className="text-2xl font-bold">Home</h1>
          </div>
        </div>
        <PostEditor />
        <PostFeed />
      </main>
    </FeedProvider>
  );
}
