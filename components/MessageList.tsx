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
  showPreviews?: boolean;
  messagesPerPage?: number;
}

export default function MessageList({ initialMessages, currentUserId, initialTotal, showPreviews = true, messagesPerPage = 20 }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState((initialTotal ?? initialMessages.length) > initialMessages.length);
  const [currentOffset, setCurrentOffset] = useState(initialMessages.length);
  const [localShowPreviews, setLocalShowPreviews] = useState(showPreviews);
  const [isSavingPreference, setIsSavingPreference] = useState(false);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalShowPreviews(showPreviews);
  }, [showPreviews]);

  // Save preference to database when toggle changes
  const handlePreviewsToggleChange = async (newValue: boolean) => {
    // Only save if user is authenticated
    if (!currentUserId) {
      setLocalShowPreviews(newValue);
      return;
    }

    setLocalShowPreviews(newValue);
    setIsSavingPreference(true);

    try {
      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          showPreviews: newValue,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to save preference:', data.error || 'Update failed');
        // Revert on error
        setLocalShowPreviews(!newValue);
      }
    } catch (error) {
      console.error('Error saving preference:', error);
      // Revert on error
      setLocalShowPreviews(!newValue);
    } finally {
      setIsSavingPreference(false);
    }
  };

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
      const response = await fetch(`/api/messages?limit=${messagesPerPage}&offset=${currentOffset}`);
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
      {/* Header with preview toggle */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div></div>
        <div className="d-flex align-items-center gap-2">
          <small className="text-muted me-2">Message Previews:</small>
          <div className="d-flex gap-3">
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="messagePreviewsToggle"
                id="showPreviewsToggle"
                checked={localShowPreviews === true}
                onChange={() => handlePreviewsToggleChange(true)}
                disabled={isSavingPreference}
              />
              <label className="form-check-label" htmlFor="showPreviewsToggle">
                Show
              </label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="messagePreviewsToggle"
                id="hidePreviewsToggle"
                checked={localShowPreviews === false}
                onChange={() => handlePreviewsToggleChange(false)}
                disabled={isSavingPreference}
              />
              <label className="form-check-label" htmlFor="hidePreviewsToggle">
                Hide
              </label>
            </div>
          </div>
        </div>
      </div>

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
          showPreviews={localShowPreviews}
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

