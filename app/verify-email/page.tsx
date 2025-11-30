'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    async function verifyEmail() {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus('error');
          setMessage(data.error || 'Email verification failed');
          return;
        }

        // Store tokens for auto-login
        if (data.tokens) {
          localStorage.setItem('accessToken', data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
        }

        setStatus('success');
        setMessage('Email verified successfully! Redirecting...');

        // Redirect to home page after a short delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    }

    verifyEmail();
  }, [token, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-2 text-center">Email Verification</h1>

        {status === 'loading' && (
          <div className="mt-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
            <p className="mt-4 text-center text-gray-600">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-6">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <p className="font-semibold">Success!</p>
              <p className="mt-1">{message}</p>
            </div>
            <div className="mt-4 text-center">
              <Link
                href="/"
                className="text-indigo-600 hover:text-indigo-500 underline"
              >
                Go to home page
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p className="font-semibold">Verification Failed</p>
              <p className="mt-1">{message}</p>
            </div>
            <div className="mt-4 text-center space-y-2">
              <p className="text-sm text-gray-600">
                The verification link may have expired or is invalid.
              </p>
              <div className="space-x-4">
                <Link
                  href="/register"
                  className="text-indigo-600 hover:text-indigo-500 underline"
                >
                  Register again
                </Link>
                <span className="text-gray-400">|</span>
                <Link
                  href="/login"
                  className="text-indigo-600 hover:text-indigo-500 underline"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
          <div className="z-10 max-w-md w-full">
            <h1 className="text-4xl font-bold mb-2 text-center">Email Verification</h1>
            <div className="mt-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
              <p className="mt-4 text-center text-gray-600">Loading...</p>
            </div>
          </div>
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

