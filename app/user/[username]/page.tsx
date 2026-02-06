import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { buildWallMessageWhereClause, getMessageUserSelect } from '@/lib/messages/queries';
import { LinkMetadata } from '@/lib/types';
import ProfileHeader from '@/components/ProfileHeader';
import MessageList from '@/components/MessageList';
import PublicListsTreeView from '@/components/PublicListsTreeView';
import ListPreview from '@/components/ListPreview';
import { getPublicListsByUser, buildListTree, getPublicListProperties, getPublicListDataRows } from '@/lib/lists/queries';

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

  // Fetch public lists to get the first root-level list for preview
  let firstListPreview = null;
  try {
    const publicListsResult = await getPublicListsByUser(profileUser.id, { limit: 100 });
    const publicLists = publicListsResult.lists || [];
    
    if (publicLists.length > 0) {
      // Build tree to get root-level lists
      const tree = buildListTree(publicLists);
      
      // Get first root-level list
      if (tree.length > 0) {
        const firstList = tree[0].list;
        
        // Fetch properties and first 3 items
        const [properties, dataResult] = await Promise.all([
          getPublicListProperties(firstList.id),
          getPublicListDataRows(firstList.id, {
            pagination: { limit: 3, offset: 0 }
          })
        ]);
        
        if (properties && properties.length > 0) {
          // Take only first 2 fields
          const firstTwoFields = properties.slice(0, 2);
          
          firstListPreview = {
            listId: firstList.id,
            listTitle: firstList.title,
            fields: firstTwoFields,
            items: dataResult.rows.map(row => ({
              id: row.id,
              rowData: row.rowData as Record<string, any>,
              createdAt: row.createdAt.toISOString(),
              updatedAt: row.updatedAt?.toISOString(),
            }))
          };
        }
      }
    }
  } catch (error) {
    // Silently fail - preview is optional
    console.error('Failed to fetch list preview:', error);
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        {/* Left column - public lists tree view */}
        <div className="col-lg-3 col-md-4 mb-4">
          <PublicListsTreeView username={username} />
          {firstListPreview && (
            <ListPreview
              listId={firstListPreview.listId}
              listTitle={firstListPreview.listTitle}
              fields={firstListPreview.fields}
              items={firstListPreview.items}
            />
          )}
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
