import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import MessageGrid from './MessageGrid';

export default async function DashboardMessageFeed() {
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

    // Fetch first page of messages (10 messages)
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
      take: 10, // First page
    });

    // Get total count for pagination
    const total = await prisma.message.count({ where });

    // Serialize dates to strings for client components
    const serializedMessages = messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    }));

    return (
      <MessageGrid
        initialMessages={serializedMessages}
        currentUserId={user?.id}
        itemsPerPage={10}
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

