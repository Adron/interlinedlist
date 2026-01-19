'use client';

import MessageInput from './MessageInput';
import ListsTreeView from './ListsTreeView';

interface LeftSidebarProps {
  user?: {
    id: string;
    maxMessageLength: number | null;
    defaultPubliclyVisible: boolean | null;
    emailVerified: boolean;
  } | null;
}

export default function LeftSidebar({ user }: LeftSidebarProps) {
  return (
    <div className="d-block">
      {user && (
        <>
          {!user.emailVerified ? (
            <div className="card mb-3">
              <div className="card-body">
                <div className="alert alert-warning mb-0" role="alert">
                  <h6 className="alert-heading">
                    <i className="bx bx-error-circle me-2"></i>
                    Email Verification Required
                  </h6>
                  <p className="mb-2 small">
                    Please verify your email address to post messages.
                  </p>
                  <a href="/settings" className="btn btn-sm btn-warning">
                    Verify Email
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <MessageInput
              maxLength={user.maxMessageLength || 666}
              defaultPubliclyVisible={user.defaultPubliclyVisible ?? false}
              onSubmit={() => {}}
            />
          )}
        </>
      )}

      <ListsTreeView />
    </div>
  );
}

