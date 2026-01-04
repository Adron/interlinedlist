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
}

export default function MessageList({ initialMessages, currentUserId }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  };

  // Refresh messages when a new one is added (via custom event)
  useEffect(() => {
    const handleMessageAdded = () => {
      refreshMessages();
    };

    window.addEventListener('messageAdded', handleMessageAdded);
    return () => {
      window.removeEventListener('messageAdded', handleMessageAdded);
    };
  }, []);

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
        />
      ))}
    </div>
  );
}

