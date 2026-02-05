import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { LinkMetadata } from '@/lib/types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default async function MessageFeed() {
  const user = await getCurrentUser();

  try {
    // Build where clause based on authentication
    let where: any = {};

    if (user) {
      // Authenticated users see: their own messages (public or private) + all public messages
      where = {
        OR: [
          { userId: user.id }, // User's own messages
          { publiclyVisible: true }, // All public messages
        ],
      };
    } else {
      // Unauthenticated users see only public messages
      where = {
        publiclyVisible: true,
      };
    }

    // Use user's messagesPerPage preference or default to 20
    const messagesPerPage = user?.messagesPerPage ?? 20;

    // Fetch first page of messages ordered by createdAt DESC (newest first)
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
    }));

    return (
      <>
        {user && user.emailVerified && (
          <div className="mb-3">
            <MessageInput
              maxLength={user.maxMessageLength || 666}
              defaultPubliclyVisible={user.defaultPubliclyVisible ?? false}
            />
          </div>
        )}
        <MessageList
          initialMessages={serializedMessages}
          currentUserId={user?.id}
          initialTotal={total}
          showPreviews={user?.showPreviews ?? true}
          messagesPerPage={messagesPerPage}
        />
      </>
    );
  } catch (error: any) {
    // Log the actual error for debugging
    console.error('MessageFeed error:', error?.code, error?.message);
    
    // Handle case where messages table doesn't exist yet
    // P2021 = Table does not exist
    // P2003 = Foreign key constraint failed (table might exist but relation doesn't)
    if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('Table') && error?.message?.includes('not found')) {
      return (
        <div className="alert alert-warning" role="alert">
          <strong>Database Migration Required</strong>
          <p className="mb-0">The messages table has not been created yet. Please run: <code>npx prisma migrate deploy</code></p>
        </div>
      );
    }
    
    // For other errors, show a generic error message instead of crashing
    console.error('Unexpected error in MessageFeed:', error);
    return (
      <div className="alert alert-danger" role="alert">
        <strong>Error Loading Messages</strong>
        <p className="mb-0">An error occurred while loading messages. Please try refreshing the page.</p>
      </div>
    );
  }
}

