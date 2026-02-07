'use client';

import { useState } from 'react';
import UserSelectionDatagrid from './UserSelectionDatagrid';
import OrganizationMembersDatagrid from './OrganizationMembersDatagrid';
import { OrganizationRole } from '@/lib/types';

interface OrganizationMembersManagementProps {
  organizationId: string;
  existingMemberIds: string[];
  currentUserRole: OrganizationRole | null;
}

export default function OrganizationMembersManagement({
  organizationId,
  existingMemberIds,
  currentUserRole,
}: OrganizationMembersManagementProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMemberAdded = () => {
    // Trigger refresh of members datagrid by changing key
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <UserSelectionDatagrid
        organizationId={organizationId}
        existingMemberIds={existingMemberIds}
        onMemberAdded={handleMemberAdded}
      />
      <OrganizationMembersDatagrid
        key={refreshKey}
        organizationId={organizationId}
        currentUserRole={currentUserRole}
        onRefresh={handleMemberAdded}
      />
    </>
  );
}
