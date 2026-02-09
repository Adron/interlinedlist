import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getFollowers } from '@/lib/follows/queries';
import ProfileHeader from '@/components/ProfileHeader';
import FollowersList from '@/components/follows/FollowersList';

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const currentUser = await getCurrentUser();

  const profileUser = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      bio: true,
      isPrivateAccount: true,
    },
  });

  if (!profileUser) {
    notFound();
  }

  // Fetch initial followers
  const result = await getFollowers(profileUser.id, { limit: 20, offset: 0 });

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        <div className="col-lg-8 col-md-10 mx-auto">
          <ProfileHeader
            user={profileUser}
            currentUserId={currentUser?.id}
          />
          <FollowersList
            userId={profileUser.id}
            initialFollowers={result.followers.map((f) => ({
              ...f,
              createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
            }))}
            initialTotal={result.pagination.total}
            showStatus={currentUser?.id === profileUser.id}
          />
        </div>
      </div>
    </div>
  );
}
