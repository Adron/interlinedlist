import { prisma } from '@/lib/prisma';
import { isTokenExpired } from '@/lib/auth/tokens';
import { getCurrentUser } from '@/lib/auth/session';
import VerifyEmailForm from './VerifyEmailForm';
import Link from 'next/link';

interface PageProps {
  searchParams: { token?: string };
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const token = searchParams.token;
  const currentUser = await getCurrentUser();

  if (!token) {
    return (
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card">
              <div className="card-body p-4">
                <h1 className="card-title text-center mb-4">Invalid Verification Link</h1>
                <div className="alert alert-danger" role="alert">
                  The verification link is invalid or missing. Please request a new verification email.
                </div>
                <p className="text-center mb-0">
                  {currentUser ? (
                    <Link href="/dashboard" className="text-decoration-none">Go to Dashboard</Link>
                  ) : (
                    <Link href="/login" className="text-decoration-none">Go to Login</Link>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Find user by verification token
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
    },
    select: {
      id: true,
      emailVerified: true,
      emailVerificationExpires: true,
    },
  });

  // Check if user is already verified
  if (currentUser?.emailVerified) {
    return (
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card">
              <div className="card-body p-4">
                <h1 className="card-title text-center mb-4">Email Already Verified</h1>
                <div className="alert alert-success" role="alert">
                  Your email is already verified. You can continue using InterlinedList.
                </div>
                <p className="text-center mb-0">
                  <Link href="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card">
              <div className="card-body p-4">
                <h1 className="card-title text-center mb-4">Invalid Verification Link</h1>
                <div className="alert alert-danger" role="alert">
                  The verification link is invalid or has already been used.
                </div>
                <p className="text-center mb-0">
                  {currentUser ? (
                    <Link href="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
                  ) : (
                    <Link href="/login" className="btn btn-primary">Go to Login</Link>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = isTokenExpired(user.emailVerificationExpires);
  const isValid = !isExpired && !user.emailVerified;

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card">
            <div className="card-body p-4">
              <h1 className="card-title text-center mb-4">Verify Your Email</h1>
              <p className="text-center text-muted mb-4">
                Click the button below to verify your email address.
              </p>
              <VerifyEmailForm token={token} isValid={isValid} isExpired={isExpired} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

