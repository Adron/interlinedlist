import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getFollowers, getFollowCounts } from '@/lib/follows/queries';
import ProfileHeader from '@/components/ProfileHeader';
import FollowersList from '@/components/follows/FollowersList';
import FollowNavigation from '@/components/follows/FollowNavigation';

export default async function FollowersPage({
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

  // Fetch initial followers
  let result;
  try {
    result = await getFollowers(profileUser.id, { limit: 20, offset: 0 });
  } catch (error: any) {
    // If Follow table doesn't exist, use empty result
    if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('follow')) {
      result = { followers: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } };
    } else {
      throw error;
    }
  }

  // Get follower/following counts for ProfileHeader
  let followerCount = 0;
  let followingCount = 0;
  try {
    const counts = await getFollowCounts(profileUser.id);
    followerCount = counts.followers;
    followingCount = counts.following;
  } catch (error: any) {
    if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('follow')) {
      followerCount = 0;
      followingCount = 0;
    }
  }

  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        <div className="col-lg-8 col-md-10 mx-auto">
          <ProfileHeader
            user={{
              ...profileUser,
              followerCount,
              followingCount,
            }}
            currentUserId={currentUser?.id}
          />
          <FollowNavigation username={username} isOwnProfile={isOwnProfile} />
          <FollowersList
            userId={profileUser.id}
            initialFollowers={result.followers.map((f) => ({
              ...f,
              createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
            }))}
            initialTotal={result.pagination.total}
            showStatus={isOwnProfile}
            currentUserId={currentUser?.id}
          />
        </div>
      </div>
    </div>
  );
}
