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
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card">
              <div className="card-body p-4">
                <h1 className="card-title text-center mb-4">Invalid Reset Link</h1>
                <div className="alert alert-danger" role="alert">
                  The password reset link is invalid or missing. Please request a new password reset.
                </div>
                <p className="text-center mb-0">
                  <Link href="/forgot-password" className="text-decoration-none">Request New Reset Link</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Find user by reset token
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
    },
    select: {
      id: true,
      passwordResetExpires: true,
    },
  });

  if (!user) {
    return (
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card">
              <div className="card-body p-4">
                <h1 className="card-title text-center mb-4">Invalid Reset Link</h1>
                <div className="alert alert-danger" role="alert">
                  The password reset link is invalid or has already been used.
                </div>
                <p className="text-center mb-0">
                  <Link href="/forgot-password" className="text-decoration-none">Request New Reset Link</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
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
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card">
              <div className="card-body p-4">
                <h1 className="card-title text-center mb-4">Reset Link Expired</h1>
                <div className="alert alert-danger" role="alert">
                  This password reset link has expired. Please request a new password reset link.
                </div>
                <p className="text-center mb-0">
                  <Link href="/forgot-password" className="text-decoration-none">Request New Reset Link</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Token is valid, show reset form
  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card">
            <div className="card-body p-4">
              <h1 className="card-title text-center mb-4">Reset Your Password</h1>
              <p className="text-muted text-center mb-4">
                Enter your new password below.
              </p>
              <ResetPasswordForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

