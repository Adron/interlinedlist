import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import ProfileSettings from './ProfileSettings';
import EmailVerificationSection from './EmailVerificationSection';
import SecuritySection from './SecuritySection';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-0">Settings</h1>
        </div>
      </div>

      <div className="row g-4">
        {/* Column 1: Profile Settings */}
        {/* Large: 3 columns (4/12), Medium: left column (6/12), Small: stacked (12/12) */}
        <div className="col-lg-4 col-md-6 col-12 order-1 order-md-1">
          <ProfileSettings user={user} />
        </div>

        {/* Column 2: Email Verification */}
        {/* Large: middle column (4/12), Medium: left column below Profile (6/12), Small: stacked (12/12) */}
        <div className="col-lg-4 col-md-6 col-12 order-2 order-md-2">
          <EmailVerificationSection emailVerified={user.emailVerified} />
        </div>

        {/* Column 3: Security Settings */}
        {/* Large: right column (4/12), Medium: right column (6/12), Small: stacked (12/12) */}
        <div className="col-lg-4 col-md-6 col-12 order-3 order-md-3">
          <SecuritySection />
        </div>
      </div>
    </div>
  );
}

