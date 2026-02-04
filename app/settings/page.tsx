import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import ProfileSettings from './ProfileSettings';
import PermissionsSection from './PermissionsSection';
import ViewPreferencesSection from './ViewPreferencesSection';
import SecuritySection from './SecuritySection';
import ProfileLocationSection from './ProfileLocationSection';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container-fluid py-4">
      <div className="row g-4">
        {/* Column 1: Profile Settings */}
        {/* Large: 3 columns (4/12), Medium: left column (6/12), Small: stacked (12/12) */}
        <div className="col-lg-4 col-md-6 col-12 order-1 order-md-1">
          <ProfileSettings user={user} />
        </div>

        {/* Column 2: Middle section - Permissions (top) and View Preferences (below) */}
        {/* Large: middle column (4/12), Medium: left column below Profile (6/12), Small: stacked (12/12) */}
        <div className="col-lg-4 col-md-6 col-12 order-2 order-md-2">
          <div className="d-flex flex-column gap-4">
            {/* Permissions Section */}
            <PermissionsSection emailVerified={user.emailVerified} />
            {/* Profile location (for wall page) */}
            <ProfileLocationSection latitude={user.latitude ?? null} longitude={user.longitude ?? null} />
            {/* View Preferences Section */}
            <ViewPreferencesSection
              messagesPerPage={user.messagesPerPage ?? 20}
              viewingPreference={user.viewingPreference ?? 'all_messages'}
              showPreviews={user.showPreviews ?? true}
            />
          </div>
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

