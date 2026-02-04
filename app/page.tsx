import { getCurrentUser } from '@/lib/auth/session';
import MessageFeed from '@/components/MessageFeed';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import RightSidebar from '@/components/RightSidebar';

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="container-fluid py-4">
      {user && !user.emailVerified && (
        <div className="row mb-3">
          <div className="col-12">
            <EmailVerificationBanner emailVerified={user.emailVerified} />
          </div>
        </div>
      )}
      <div className="row">
        {/* Center Column - Messages Feed */}
        <div className="col-lg-8 col-md-12 mb-4">
          <MessageFeed />
        </div>

        {/* Right Column - Sidebar */}
        <div className="col-lg-4 col-12 mb-4">
          <RightSidebar showLocation={!!user} />
        </div>
      </div>
    </div>
  );
}
