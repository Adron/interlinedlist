import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getFollowing } from '@/lib/follows/queries';
import ProfileHeader from '@/components/ProfileHeader';
import FollowingList from '@/components/follows/FollowingList';

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const currentUser = await getCurrentUser();

  let profileUser;
  try {
    profileUser = await prisma.user.findUnique({
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
  } catch (error: any) {
    // If isPrivateAccount column doesn't exist, retry without it
    if (error?.code === 'P2022' || error?.message?.includes('isPrivateAccount')) {
      profileUser = await prisma.user.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          bio: true,
        },
      });
      // Add default isPrivateAccount
      if (profileUser) {
        profileUser = { ...profileUser, isPrivateAccount: false };
      }
    } else {
      throw error;
    }
  }

  if (!profileUser) {
    notFound();
  }

  // Fetch initial following
  let result;
  try {
    result = await getFollowing(profileUser.id, { limit: 20, offset: 0 });
  } catch (error: any) {
    // If Follow table doesn't exist, use empty result
    if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('follow')) {
      result = { following: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } };
    } else {
      throw error;
    }
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        <div className="col-lg-8 col-md-10 mx-auto">
          <ProfileHeader
            user={profileUser}
            currentUserId={currentUser?.id}
          />
          <FollowingList
            userId={profileUser.id}
            initialFollowing={result.following.map((f) => ({
              ...f,
              createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
            }))}
            initialTotal={result.pagination.total}
            showStatus={true}
          />
        </div>
      </div>
    </div>
  );
}
