'use client';

interface ClearedStatusBannerProps {
  cleared: boolean;
}

export default function ClearedStatusBanner({ cleared }: ClearedStatusBannerProps) {
  if (cleared) {
    return null;
  }

  return (
    <div className="alert alert-warning" role="alert">
      <h5 className="alert-heading">
        <i className="bx bx-time me-2"></i>
        Account Pending Approval
      </h5>
      <p className="mb-0">
        Your account is pending approval. Contact an administrator to get full access to posting and creating lists.
      </p>
    </div>
  );
}
