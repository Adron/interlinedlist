'use client';

import EmailVerificationResend from './EmailVerificationResend';

interface EmailVerificationSectionProps {
  emailVerified: boolean;
}

export default function EmailVerificationSection({ emailVerified }: EmailVerificationSectionProps) {
  return (
    <div className="card h-100">
      <div className="card-body">
        <h3 className="h5 mb-4">Email Verification</h3>
        
        <div className="mb-3">
          <h4 className="h6 mb-2">Verification Status</h4>
          <p className="mb-3">
            {emailVerified ? (
              <>
                <span className="text-success">✓</span> Your email address is verified.
              </>
            ) : (
              <>
                <span className="text-danger">✗</span> Your email address is not verified. Please verify your email to access all features.
              </>
            )}
          </p>
          {!emailVerified && (
            <EmailVerificationResend />
          )}
        </div>
      </div>
    </div>
  );
}

