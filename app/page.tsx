import { getCurrentUser } from '@/lib/auth/session';
import MessageFeed from '@/components/MessageFeed';
import LeftSidebar from '@/components/LeftSidebar';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import RightSidebar from '@/components/RightSidebar';

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="container-fluid container-fluid-max py-4">
      {user && !user.emailVerified && (
        <div className="row mb-3">
          <div className="col-12">
            <EmailVerificationBanner emailVerified={user.emailVerified} />
          </div>
        </div>
      )}
      <div className="row">
        {/* Left Column - Sidebar */}
        <div className="col-lg-3 col-md-4 mb-4">
          <LeftSidebar user={user} />
        </div>

        {/* Center Column - Messages Feed */}
        <div className="col-lg-6 col-md-8 mb-4">
          <MessageFeed />
        </div>

        {/* Right Column - Sidebar */}
        <div className="col-lg-3 col-12 mb-4 order-lg-3">
          <RightSidebar showLocation={!!user} />
        </div>
      </div>
    </div>
  );
}
