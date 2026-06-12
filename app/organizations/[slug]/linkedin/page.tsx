import { getCurrentUser } from '@/lib/auth/session';
import {
  getOrganizationBySlug,
  getUserRoleInOrganization,
  getOrganizationMembers,
} from '@/lib/organizations/queries';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import OrgLinkedInSettings from '@/components/organizations/OrgLinkedInSettings';

export const dynamic = 'force-dynamic';

export default async function OrgLinkedInPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const organization = await getOrganizationBySlug(slug);
  if (!organization) notFound();

  const role = await getUserRoleInOrganization(organization.id, user.id);
  if (!role) redirect(`/organizations/${slug}`);

  const canManage = role === 'owner' || role === 'admin';

  const credential = await prisma.orgLinkedInCredential.findUnique({
    where: { organizationId: organization.id },
    include: {
      pages: {
        include: {
          assignments: {
            include: {
              user: {
                select: { id: true, username: true, displayName: true, avatar: true },
              },
            },
          },
        },
      },
    },
  });

  const membersResult = await getOrganizationMembers(organization.id, { limit: 100 });
  const members = membersResult.members ?? [];

  return (
    <div className="container-fluid container-fluid-max py-4">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/organizations">Organizations</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href={`/organizations/${slug}`}>{organization.name}</Link>
          </li>
          <li className="breadcrumb-item active">LinkedIn</li>
        </ol>
      </nav>

      <h2 className="mb-4">LinkedIn Integration</h2>

      {error && (
        <div className="alert alert-danger mb-4">{decodeURIComponent(error)}</div>
      )}

      <OrgLinkedInSettings
        organization={{ id: organization.id, name: organization.name, slug: organization.slug }}
        credential={credential}
        members={members}
        userRole={role}
        canManage={canManage}
      />
    </div>
  );
}
