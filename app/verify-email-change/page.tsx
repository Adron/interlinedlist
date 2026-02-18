import { prisma } from '@/lib/prisma';
import { isTokenExpired } from '@/lib/auth/tokens';
import VerifyEmailChangeForm from './VerifyEmailChangeForm';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ token?: string }> | { token?: string };
}

export default async function VerifyEmailChangePage({ searchParams }: PageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const token = params?.token;

  if (!token) {
    return (
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card">
              <div className="card-body p-4">
                <h1 className="card-title text-center mb-4">Invalid Verification Link</h1>
                <div className="alert alert-danger" role="alert">
                  The verification link is invalid or missing. Please request a new verification email from Settings.
                </div>
                <p className="text-center mb-0">
                  <Link href="/settings" className="btn btn-primary">
                    Go to Settings
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      emailChangeToken: token,
    },
    select: {
      id: true,
      pendingEmail: true,
      emailChangeExpires: true,
    },
  });

  if (!user || !user.pendingEmail) {
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
                  <Link href="/settings" className="btn btn-primary">
                    Go to Settings
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = isTokenExpired(user.emailChangeExpires);
  const isValid = !isExpired;

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card">
            <div className="card-body p-4">
              <h1 className="card-title text-center mb-4">Confirm Email Change</h1>
              <p className="text-center text-muted mb-4">
                Click the button below to confirm changing your email address to{' '}
                <strong>{user.pendingEmail}</strong>.
              </p>
              <VerifyEmailChangeForm token={token} isValid={isValid} isExpired={isExpired} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
