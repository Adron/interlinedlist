'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface MessageGridProps {
  initialMessages: Message[];
  currentUserId?: string;
  itemsPerPage?: number;
}

export default function MessageGrid({ 
  initialMessages, 
  currentUserId,
  itemsPerPage = 10 
}: MessageGridProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(initialMessages.length);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialMessages.length >= itemsPerPage);

  const totalPages = Math.ceil(totalMessages / itemsPerPage);

  const fetchMessages = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * itemsPerPage;
      const response = await fetch(`/api/messages?limit=${itemsPerPage}&offset=${offset}`);
      
      if (response.ok) {
        const data = await response.json();
        // Ensure dates are serialized to ISO strings
        const serializedMessages = (data.messages || []).map((message: any) => ({
          ...message,
          createdAt: typeof message.createdAt === 'string' 
            ? message.createdAt 
            : new Date(message.createdAt).toISOString(),
        }));
        setMessages(serializedMessages);
        setTotalMessages(data.pagination?.total || serializedMessages.length);
        setHasMore(data.pagination?.hasMore || false);
      } else {
        console.error('Failed to fetch messages:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage]);

  useEffect(() => {
    fetchMessages(currentPage);
  }, [currentPage, fetchMessages]);

  const handleDelete = useCallback((deletedMessageId: string) => {
    setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== deletedMessageId));
    setTotalMessages((prev) => Math.max(0, prev - 1));
    
    // If current page becomes empty and not on first page, go to previous page
    const remainingOnPage = messages.filter((msg) => msg.id !== deletedMessageId).length;
    if (remainingOnPage === 0 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else {
      // Refresh current page to maintain pagination
      fetchMessages(currentPage);
    }
  }, [messages, currentPage, fetchMessages]);

  // Listen for new messages
  useEffect(() => {
    const handleMessageAdded = () => {
      // If on first page, refresh to show new message
      if (currentPage === 1) {
        fetchMessages(1);
      }
    };

    window.addEventListener('messageAdded', handleMessageAdded);
    return () => {
      window.removeEventListener('messageAdded', handleMessageAdded);
    };
  }, [currentPage, fetchMessages]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No messages yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <div>
      {isLoading && (
        <div className="text-center mb-3">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      <div className="row g-3">
        {messages.map((message) => (
          <div key={message.id} className="col-md-6">
            <MessageCard
              message={message}
              currentUserId={currentUserId}
              onDelete={handleDelete}
            />
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Message pagination" className="mt-4">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
              >
                Previous
              </button>
            </li>
            
            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => goToPage(page)}
                      disabled={isLoading}
                    >
                      {page}
                    </button>
                  </li>
                );
              } else if (
                page === currentPage - 2 ||
                page === currentPage + 2
              ) {
                return (
                  <li key={page} className="page-item disabled">
                    <span className="page-link">...</span>
                  </li>
                );
              }
              return null;
            })}
            
            <li className={`page-item ${currentPage === totalPages || !hasMore ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || !hasMore || isLoading}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

