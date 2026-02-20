import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getLinkedIdentitiesForUser } from '@/lib/auth/linked-identities';
import Link from 'next/link';
import ProfileSettings from './ProfileSettings';
import PermissionsSection from './PermissionsSection';
import ProfileLocationSection from './ProfileLocationSection';
import ViewPreferencesSection from './ViewPreferencesSection';
import MessageSettingsSection from './MessageSettingsSection';
import SecuritySection from './SecuritySection';

interface SettingsPageProps {
  searchParams: Promise<{ error?: string; success?: string }> | { error?: string; success?: string };
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const params = (searchParams instanceof Promise ? await searchParams : searchParams) ?? {};
  const linkedIdentities = await getLinkedIdentitiesForUser(user.id);
  const serializedIdentities = linkedIdentities.map((i) => ({
    ...i,
    connectedAt: i.connectedAt.toISOString(),
    lastVerifiedAt: i.lastVerifiedAt?.toISOString() ?? null,
  }));

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center gap-3">
            <Link href="/dashboard" className="btn btn-outline-secondary btn-sm">
              <i className="bx bx-arrow-back me-1"></i>
              Back to Dashboard
            </Link>
            <h1 className="h3 mb-0">Settings</h1>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Column 1: Profile Settings */}
        <div className="col-lg-4 col-md-6 col-12 order-1 order-md-1">
          <ProfileSettings user={user} />
        </div>

        {/* Column 2: Permissions, Profile location, View preferences, Message settings */}
        <div className="col-lg-4 col-md-6 col-12 order-2 order-md-2">
          <div className="d-flex flex-column gap-4">
            <PermissionsSection emailVerified={user.emailVerified} />
            <ProfileLocationSection
              latitude={user.latitude ?? null}
              longitude={user.longitude ?? null}
            />
            <ViewPreferencesSection
              messagesPerPage={user.messagesPerPage ?? 20}
              viewingPreference={user.viewingPreference ?? 'all_messages'}
              showPreviews={user.showPreviews ?? true}
            />
            <MessageSettingsSection
              defaultPubliclyVisible={user.defaultPubliclyVisible ?? false}
              showAdvancedPostSettings={user.showAdvancedPostSettings ?? false}
            />
          </div>
        </div>

        {/* Column 3: Security Settings */}
        <div className="col-lg-4 col-md-6 col-12 order-3 order-md-3 d-flex flex-column gap-4">
          <SecuritySection
            isPrivateAccount={user.isPrivateAccount ?? false}
            linkedIdentities={serializedIdentities}
            initialError={params.error}
            initialSuccess={params.success}
          />
        </div>
      </div>
    </div>
  );
}
