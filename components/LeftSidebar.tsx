'use client';

import { useState } from 'react';
import MessageInput from './MessageInput';

interface LeftSidebarProps {
  user?: {
    id: string;
    maxMessageLength: number | null;
    defaultPubliclyVisible: boolean | null;
    emailVerified: boolean;
  } | null;
}

export default function LeftSidebar({ user }: LeftSidebarProps) {
  const [showMessageInput, setShowMessageInput] = useState(false);

  return (
    <div className="d-none d-lg-block">
      <div className="card mb-3">
        <div className="card-body">
          <p className="text-muted">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
          </p>
        </div>
      </div>

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
          ) : !showMessageInput ? (
            <button
              className="btn btn-primary w-100"
              onClick={() => setShowMessageInput(true)}
            >
              <i className="bx bx-plus me-2"></i>
              Add Message
            </button>
          ) : (
            <MessageInput
              maxLength={user.maxMessageLength || 666}
              defaultPubliclyVisible={user.defaultPubliclyVisible ?? false}
              onSubmit={() => setShowMessageInput(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

