import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { LinkMetadata } from '@/lib/types';
import MessageTable from './MessageTable';

export default async function DashboardMessageFeed() {
  const user = await getCurrentUser();

  try {
    // Build where clause based on authentication
    let where: any = {};

    if (user) {
      // Only show user's own messages (public or private)
      where = {
        userId: user.id, // Only user's own messages
      };
    } else {
      // Unauthenticated users see only public messages
      where = {
        publiclyVisible: true,
      };
    }

    // Use user's messagesPerPage preference or default to 20
    const messagesPerPage = user?.messagesPerPage ?? 20;

    // Fetch first page of messages
    const messages = await prisma.message.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: messagesPerPage,
    });

    // Get total count for pagination
    const total = await prisma.message.count({ where });

    // Serialize dates to strings for client components
    const serializedMessages = messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      linkMetadata: message.linkMetadata as LinkMetadata | null,
      imageUrls: (Array.isArray(message.imageUrls) ? message.imageUrls : null) as string[] | null,
      videoUrls: (Array.isArray(message.videoUrls) ? message.videoUrls : null) as string[] | null,
    }));

    return (
      <MessageTable
        initialMessages={serializedMessages}
        initialTotal={total}
        currentUserId={user?.id}
        itemsPerPage={messagesPerPage}
        showPreviews={user?.showPreviews ?? true}
        onlyMine={true}
        dateFormat="datagrid"
      />
    );
  } catch (error: any) {
    // Handle case where messages table doesn't exist yet
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return (
        <div className="alert alert-warning" role="alert">
          <strong>Database Migration Required</strong>
          <p className="mb-0">The messages table has not been created yet. Please run: <code>npx prisma migrate deploy</code></p>
        </div>
      );
    }
    
    console.error('Unexpected error in DashboardMessageFeed:', error);
    return (
      <div className="alert alert-danger" role="alert">
        <strong>Error Loading Messages</strong>
        <p className="mb-0">An error occurred while loading messages. Please try refreshing the page.</p>
      </div>
    );
  }
}

