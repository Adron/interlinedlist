import { getCurrentUser } from '@/lib/auth/session';
import MessageFeed from '@/components/MessageFeed';
import LeftSidebar from '@/components/LeftSidebar';

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="container-fluid py-4">
      <div className="row">
        {/* Left Column - Sidebar */}
        <div className="col-lg-3 col-md-4 mb-4">
          <LeftSidebar user={user} />
        </div>

        {/* Center Column - Messages Feed */}
        <div className="col-lg-6 col-md-8 mb-4">
          <div className="mb-3">
            <h2 className="h4 mb-0">Messages</h2>
            <p className="text-muted small mb-0">Latest updates from the community</p>
          </div>
          <MessageFeed />
        </div>

        {/* Right Column - Sidebar */}
        <div className="col-lg-3 d-none d-lg-block">
          <div className="card">
            <div className="card-body">
              <p className="text-muted">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
