'use client';

import { useState, useEffect } from 'react';
import MessageCard from './MessageCard';

interface MessageUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface Message {
  id: string;
  content: string;
  publiclyVisible: boolean;
  createdAt: string;
  user: MessageUser;
}

interface MessageListProps {
  initialMessages: Message[];
  currentUserId?: string;
  initialTotal?: number;
}

export default function MessageList({ initialMessages, currentUserId, initialTotal }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState((initialTotal ?? initialMessages.length) > initialMessages.length);
  const [currentOffset, setCurrentOffset] = useState(initialMessages.length);

  const refreshMessages = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to refresh messages:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete message');
      }

      // Remove message from local state
      setMessages(messages.filter((msg) => msg.id !== messageId));
      setCurrentOffset((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  };

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/messages?limit=20&offset=${currentOffset}`);
      if (response.ok) {
        const data = await response.json();
        const newMessages = (data.messages || []).map((message: any) => ({
          ...message,
          createdAt: typeof message.createdAt === 'string' 
            ? message.createdAt 
            : new Date(message.createdAt).toISOString(),
        }));
        
        if (newMessages.length > 0) {
          setMessages((prev) => [...prev, ...newMessages]);
          setCurrentOffset((prev) => prev + newMessages.length);
          setHasMore(data.pagination?.hasMore || false);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Refresh messages when a new one is added (via custom event)
  useEffect(() => {
    const handleMessageAdded = () => {
      refreshMessages();
      // Reset pagination when new message is added
      setCurrentOffset(initialMessages.length);
      setHasMore((initialTotal ?? initialMessages.length) > initialMessages.length);
    };

    window.addEventListener('messageAdded', handleMessageAdded);
    return () => {
      window.removeEventListener('messageAdded', handleMessageAdded);
    };
  }, [initialMessages.length, initialTotal]);

  if (messages.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No messages yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <div>
      {isRefreshing && (
        <div className="text-center mb-3">
          <small className="text-muted">Refreshing...</small>
        </div>
      )}
      {messages.map((message) => (
        <MessageCard
          key={message.id}
          message={message}
          currentUserId={currentUserId}
          onDelete={handleDelete}
          showCheckbox={false}
        />
      ))}
      
      {hasMore && (
        <div className="text-center mt-4">
          <button
            className="btn btn-primary"
            onClick={loadMoreMessages}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Loading...
              </>
            ) : (
              'Show More Messages'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

