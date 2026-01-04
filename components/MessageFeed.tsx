import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import MessageList from './MessageList';

export default async function MessageFeed() {
  const user = await getCurrentUser();

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

  // Fetch messages ordered by createdAt DESC (newest first)
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
    take: 50, // Limit to 50 most recent messages
  });

  // Serialize dates to strings for client components
  const serializedMessages = messages.map((message) => ({
    ...message,
    createdAt: message.createdAt.toISOString(),
  }));

  return (
    <MessageList
      initialMessages={serializedMessages}
      currentUserId={user?.id}
    />
  );
}

