import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { buildWallMessageWhereClause, getMessageUserSelect } from '@/lib/messages/queries';
import { LinkMetadata } from '@/lib/types';
import ProfileHeader from '@/components/ProfileHeader';
import MessageList from '@/components/MessageList';
import PublicListsTreeView from '@/components/PublicListsTreeView';

const DEFAULT_MESSAGES_PER_PAGE = 20;

export default async function UserProfilePage({
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
      latitude: true,
      longitude: true,
    },
  });

  if (!profileUser) {
    notFound();
  }

  const where = buildWallMessageWhereClause(profileUser.id, currentUser?.id ?? null);
  const messagesPerPage = currentUser?.messagesPerPage ?? DEFAULT_MESSAGES_PER_PAGE;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: {
        user: {
          select: getMessageUserSelect(),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: messagesPerPage,
    }),
    prisma.message.count({ where }),
  ]);

  const serializedMessages = messages.map((message) => ({
    ...message,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    linkMetadata: message.linkMetadata as LinkMetadata | null,
  }));

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        {/* Left column - public lists tree view */}
        <div className="col-lg-3 col-md-4 mb-4">
          <PublicListsTreeView username={username} />
        </div>

        {/* Center - profile header + message cards (main-page style) */}
        <div className="col-lg-6 col-md-8 mb-4">
          <ProfileHeader user={profileUser} />
          <MessageList
            initialMessages={serializedMessages}
            initialTotal={total}
            currentUserId={currentUser?.id}
            showPreviews={currentUser?.showPreviews ?? true}
            messagesPerPage={messagesPerPage}
            messagesApiUrl={`/api/user/${encodeURIComponent(username)}/messages`}
          />
        </div>

        {/* Right column empty to match main page layout balance, or could add something later */}
        <div className="col-lg-3 col-12 mb-4 order-lg-3" />
      </div>
    </div>
  );
}
