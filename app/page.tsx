import { getCurrentUser } from '@/lib/auth/session';
import MessageFeed from '@/components/MessageFeed';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import ClearedStatusBanner from '@/components/ClearedStatusBanner';
import RightSidebar from '@/components/RightSidebar';

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="container-fluid container-fluid-max py-2">
      {user && !user.emailVerified && (
        <div className="row mb-2">
          <div className="col-12">
            <EmailVerificationBanner emailVerified={user.emailVerified} />
          </div>
        </div>
      )}
      {user && user.emailVerified && !user.cleared && (
        <div className="row mb-2">
          <div className="col-12">
            <ClearedStatusBanner cleared={user.cleared} />
          </div>
        </div>
      )}
      <div className="row g-2">
        {/* Center Column - Messages Feed */}
        <div className="col-lg-8 col-md-12">
          <MessageFeed />
        </div>

        {/* Right Column - Sidebar */}
        <div className="col-lg-4 col-12">
          <RightSidebar
            latitude={user?.latitude ?? undefined}
            longitude={user?.longitude ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
