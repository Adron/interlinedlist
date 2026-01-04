'use client';

import { useState } from 'react';
import MessageInput from './MessageInput';

interface LeftSidebarProps {
  user?: {
    id: string;
    maxMessageLength: number | null;
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
          {!showMessageInput ? (
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
              onSubmit={() => setShowMessageInput(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

