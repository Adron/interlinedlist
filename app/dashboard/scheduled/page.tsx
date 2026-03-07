import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';
import ScheduledPageContent from '@/components/scheduled/ScheduledPageContent';

export default async function ScheduledPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <ListBreadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Scheduled', href: undefined },
        ]}
      />
      <ScheduledPageContent />
    </div>
  );
}
