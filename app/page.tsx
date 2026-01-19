import { getCurrentUser } from '@/lib/auth/session';
import MessageFeed from '@/components/MessageFeed';
import LeftSidebar from '@/components/LeftSidebar';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import WeatherWidget from '@/components/WeatherWidget';
import LocationWidget from '@/components/LocationWidget';

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
          <div className="mb-3">
            <h2 className="h4 mb-0">Messages</h2>
            <p className="text-muted small mb-0">Latest updates from the community</p>
          </div>
          <MessageFeed />
        </div>

        {/* Right Column - Sidebar */}
        <div className="col-lg-3 col-12 mb-4 order-lg-3">
          {user && <LocationWidget />}
          <WeatherWidget />
        </div>
      </div>
    </div>
  );
}
