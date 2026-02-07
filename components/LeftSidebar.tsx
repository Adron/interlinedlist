'use client';

import Link from 'next/link';
import MessageInput from './MessageInput';
import ListsTreeView from './ListsTreeView';

interface LeftSidebarProps {
  user?: {
    id: string;
    maxMessageLength: number | null;
    defaultPubliclyVisible: boolean | null;
    showAdvancedPostSettings?: boolean | null;
    emailVerified: boolean;
  } | null;
}

export default function LeftSidebar({ user }: LeftSidebarProps) {
  return (
    <div className="d-block">
      {user ? (
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
              showAdvancedPostSettings={user.showAdvancedPostSettings ?? false}
              onSubmit={() => {}}
            />
          )}
          <ListsTreeView />
        </>
      ) : (
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title mb-3">
              <i className="bx bx-rocket me-2 text-primary"></i>
              Join the Community
            </h5>
            <p className="mb-3">
              Look, here's the deal—this platform is built for people who want to share ideas, build connections, and create something meaningful together. Whether you're posting thoughts, organizing lists, or just engaging with the community, there's a place for you here.
            </p>
            <p className="mb-3">
              Sign up and you'll get access to post messages, create your own lists, and be part of a growing community of makers, thinkers, and doers. No BS, no complicated onboarding—just straightforward tools to help you share what matters.
            </p>
            <p className="mb-3 small text-muted">
              Plus, you'll be able to customize your experience, manage your content, and connect with others who are building cool stuff. Ready to dive in?
            </p>
            <Link href="/register" className="btn btn-primary w-100">
              <i className="bx bx-user-plus me-2"></i>
              Sign Up Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

