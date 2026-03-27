import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getMessageThreadChain } from '@/lib/messages/thread-chain';
import MessageThreadView from '@/components/MessageThreadView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MessageThreadPage({ params }: PageProps) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  const user = await getCurrentUser();
  const chain = await getMessageThreadChain(id, user?.id);

  if (!chain || chain.length === 0) {
    notFound();
  }

  return (
    <MessageThreadView
      chain={chain}
      currentUserId={user?.id}
      showPreviews={user?.showPreviews ?? true}
    />
  );
}
