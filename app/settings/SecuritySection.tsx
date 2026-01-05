'use client';

import Link from 'next/link';

export default function SecuritySection() {
  return (
    <div className="card h-100">
      <div className="card-body">
        <h3 className="h5 mb-4">Security</h3>
        
        <div>
          <h4 className="h6 mb-2">Change Password</h4>
          <p className="text-muted small mb-3">
            If you want to change your password, we'll send you a secure link to reset it via email.
          </p>
          <Link href="/forgot-password" className="btn btn-secondary">
            Reset Password
          </Link>
        </div>
      </div>
    </div>
  );
}

