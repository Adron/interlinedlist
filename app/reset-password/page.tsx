import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isTokenExpired } from '@/lib/auth/tokens';
import ResetPasswordForm from './ResetPasswordForm';

interface PageProps {
  searchParams: { token?: string };
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--color-text)', textAlign: 'center' }}>
          Invalid Reset Link
        </h1>
        <div style={{ 
          color: 'var(--color-error)', 
          padding: '15px', 
          backgroundColor: 'var(--color-error-bg)', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          The password reset link is invalid or missing. Please request a new password reset.
        </div>
        <p style={{ textAlign: 'center', color: 'var(--color-text)' }}>
          <Link href="/forgot-password" style={{ color: 'var(--color-link)' }}>Request New Reset Link</Link>
        </p>
      </div>
    );
  }

  // Find user by reset token
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
    },
  });

  if (!user) {
    return (
      <div style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--color-text)', textAlign: 'center' }}>
          Invalid Reset Link
        </h1>
        <div style={{ 
          color: 'var(--color-error)', 
          padding: '15px', 
          backgroundColor: 'var(--color-error-bg)', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          The password reset link is invalid or has already been used.
        </div>
        <p style={{ textAlign: 'center', color: 'var(--color-text)' }}>
          <Link href="/forgot-password" style={{ color: 'var(--color-link)' }}>Request New Reset Link</Link>
        </p>
      </div>
    );
  }

  // Check if token is expired
  if (isTokenExpired(user.passwordResetExpires)) {
    // Clear expired token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return (
      <div style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--color-text)', textAlign: 'center' }}>
          Reset Link Expired
        </h1>
        <div style={{ 
          color: 'var(--color-error)', 
          padding: '15px', 
          backgroundColor: 'var(--color-error-bg)', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          This password reset link has expired. Please request a new password reset link.
        </div>
        <p style={{ textAlign: 'center', color: 'var(--color-text)' }}>
          <Link href="/forgot-password" style={{ color: 'var(--color-link)' }}>Request New Reset Link</Link>
        </p>
      </div>
    );
  }

  // Token is valid, show reset form
  return (
    <div style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--color-text)', textAlign: 'center' }}>
        Reset Your Password
      </h1>
      <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        Enter your new password below.
      </p>
      <ResetPasswordForm />
    </div>
  );
}

