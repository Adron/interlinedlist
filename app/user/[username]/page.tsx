import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { buildWallMessageWhereClause, getMessageUserSelect, getPushedMessageInclude } from '@/lib/messages/queries';
import { attachDugByMeIncludingPushed } from '@/lib/messages/dig';
import { LinkMetadata, CrossPostUrl, Message } from '@/lib/types';
import ProfileHeader from '@/components/ProfileHeader';
import MessageList from '@/components/MessageList';
import PublicListsTreeView from '@/components/PublicListsTreeView';
import PublicDocumentsTreeView from '@/components/PublicDocumentsTreeView';
import { getFollowCounts, getFollowStatus } from '@/lib/follows/queries';

const DEFAULT_MESSAGES_PER_PAGE = 20;

export default async function UserProfilePage({
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
        latitude: true,
        longitude: true,
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
          latitude: true,
          longitude: true,
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

  // Fetch follow counts and status
  let followerCount = 0;
  let followingCount = 0;
  let followStatus: 'none' | 'pending' | 'approved' = 'none';

  try {
    if (currentUser) {
      const [counts, status] = await Promise.all([
        getFollowCounts(profileUser.id),
        currentUser.id !== profileUser.id
          ? getFollowStatus(currentUser.id, profileUser.id)
          : Promise.resolve(null),
      ]);

      followerCount = counts.followers;
      followingCount = counts.following;
      followStatus = status === 'pending' ? 'pending' : status === 'approved' ? 'approved' : 'none';
    } else {
      // For unauthenticated users, still fetch counts
      const counts = await getFollowCounts(profileUser.id);
      followerCount = counts.followers;
      followingCount = counts.following;
    }
  } catch (error: any) {
    // If Follow table doesn't exist, silently fail and use defaults (0 counts, 'none' status)
    if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('follow')) {
      // Counts already default to 0, status already defaults to 'none'
    } else {
      throw error;
    }
  }

  // Check if content should be blocked for private accounts
  const isOwnProfile = currentUser?.id === profileUser.id;
  const isApprovedFollower = followStatus === 'approved';
  const isContentBlocked = profileUser.isPrivateAccount && !isOwnProfile && !isApprovedFollower;

  const where = { ...buildWallMessageWhereClause(profileUser.id, currentUser?.id ?? null), parentId: null };
  const messagesPerPage = currentUser?.messagesPerPage ?? DEFAULT_MESSAGES_PER_PAGE;

  const shouldIncludePrivateCounts = isOwnProfile || isApprovedFollower;

  const [messages, total, documentCount, listCount] = await Promise.all([
    prisma.message.findMany({
      where,
      include: {
        user: {
          select: getMessageUserSelect(),
        },
        ...getPushedMessageInclude(),
      },
      orderBy: { createdAt: 'desc' },
      take: messagesPerPage,
    }),
    prisma.message.count({ where }),
    prisma.document.count({
      where: {
        userId: profileUser.id,
        deletedAt: null,
        ...(shouldIncludePrivateCounts ? {} : { isPublic: true }),
      },
    }),
    prisma.list.count({
      where: {
        userId: profileUser.id,
        deletedAt: null,
        ...(shouldIncludePrivateCounts ? {} : { isPublic: true }),
      },
    }),
  ]);

  const serializedMessages = messages.map((message) => {
    const pushed = message.pushedMessage;
    return {
      ...message,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      scheduledAt: message.scheduledAt?.toISOString() ?? null,
      linkMetadata: message.linkMetadata as LinkMetadata | null,
      crossPostUrls: (Array.isArray(message.crossPostUrls) ? message.crossPostUrls : null) as CrossPostUrl[] | null,
      ...(pushed && {
        pushedMessage: {
          ...pushed,
          createdAt: pushed.createdAt.toISOString(),
          updatedAt: pushed.updatedAt.toISOString(),
          scheduledAt: pushed.scheduledAt?.toISOString() ?? null,
          linkMetadata: pushed.linkMetadata as LinkMetadata | null,
          imageUrls: Array.isArray(pushed.imageUrls) ? pushed.imageUrls : null,
          videoUrls: Array.isArray(pushed.videoUrls) ? pushed.videoUrls : null,
          crossPostUrls: (Array.isArray(pushed.crossPostUrls) ? pushed.crossPostUrls : null) as CrossPostUrl[] | null,
        },
      }),
    };
  });

  const messagesWithDugs = await attachDugByMeIncludingPushed(serializedMessages, currentUser?.id);

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        {/* Left column - empty spacer for layout balance */}
        <div className="col-lg-3 d-none d-lg-block" aria-hidden="true" />

        {/* Center - profile header + message cards */}
        <div className="col-lg-6 col-12 mb-4">
          <ProfileHeader
            user={{
              ...profileUser,
              followerCount,
              followingCount,
              messageCount: total,
              documentCount,
              listCount,
            }}
            currentUserId={currentUser?.id}
            followStatus={followStatus}
          />
          {isOwnProfile && profileUser.isPrivateAccount && (
            <div className="alert alert-secondary d-flex align-items-center gap-2 mt-2 py-2">
              <i className="bx bx-lock"></i>
              <span>Your account is private. Only approved followers can see your posts.</span>
              <a href="/settings" className="ms-auto btn btn-sm btn-outline-secondary">
                Change in Settings
              </a>
            </div>
          )}
          {isContentBlocked ? (
            <div className="text-center py-5 text-muted">
              <i className="bx bx-lock-alt fs-1 d-block mb-2"></i>
              <p>This account is private.</p>
              <p>Follow {profileUser.displayName ?? profileUser.username} to see their posts.</p>
            </div>
          ) : (
            <MessageList
              initialMessages={messagesWithDugs as unknown as Message[]}
              initialTotal={total}
              currentUserId={currentUser?.id}
              showPreviews={currentUser?.showPreviews ?? true}
              messagesPerPage={messagesPerPage}
              messagesApiUrl={`/api/user/${encodeURIComponent(username)}/messages`}
            />
          )}
        </div>

        {/* Right column - documents tree + lists tree */}
        <div className="col-lg-3 col-12 mb-4">
          <PublicDocumentsTreeView username={username} />
          <PublicListsTreeView
            username={username}
            showWatchButtons={!!currentUser && currentUser.id !== profileUser.id}
          />
        </div>
      </div>
    </div>
  );
}
