'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  initialTotal?: number;
  currentUserId?: string;
  itemsPerPage?: number;
}

export default function MessageGrid({ 
  initialMessages, 
  initialTotal,
  currentUserId,
  itemsPerPage = 10 
}: MessageGridProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(initialTotal ?? initialMessages.length);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialMessages.length >= itemsPerPage);
  
  // Track if this is the initial mount to prevent unnecessary fetch
  const isInitialMount = useRef(true);
  // Track the last page we fetched to avoid duplicate fetches
  const lastFetchedPage = useRef<number | null>(null);

  const totalPages = Math.ceil(totalMessages / itemsPerPage);

  const fetchMessages = useCallback(async (page: number, skipLoadingState = false) => {
    // Skip if we're fetching the same page again
    if (lastFetchedPage.current === page) {
      return;
    }
    
    if (!skipLoadingState) {
      setIsLoading(true);
    }
    
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
        lastFetchedPage.current = page;
      } else {
        console.error('Failed to fetch messages:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      if (!skipLoadingState) {
        setIsLoading(false);
      }
    }
  }, [itemsPerPage]);

  // Only fetch when page changes, not on initial mount
  useEffect(() => {
    // Skip fetch on initial mount since we already have initialMessages
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Initialize lastFetchedPage to 1 since that's what we have from server
      lastFetchedPage.current = 1;
      return;
    }
    
    // Only fetch if page actually changed
    if (currentPage !== lastFetchedPage.current) {
      fetchMessages(currentPage);
    }
  }, [currentPage, fetchMessages]);

  const handleDelete = useCallback((deletedMessageId: string) => {
    setMessages((prevMessages) => {
      const updated = prevMessages.filter((msg) => msg.id !== deletedMessageId);
      // If current page becomes empty and not on first page, go to previous page
      if (updated.length === 0 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        // Refresh current page to maintain pagination
        lastFetchedPage.current = null; // Reset to allow refetch
        fetchMessages(currentPage);
      }
      return updated;
    });
    setTotalMessages((prev) => Math.max(0, prev - 1));
  }, [currentPage, fetchMessages]);

  // Listen for new messages
  useEffect(() => {
    const handleMessageAdded = () => {
      // If on first page, refresh to show new message
      if (currentPage === 1) {
        lastFetchedPage.current = null; // Reset to allow refetch
        fetchMessages(1);
      }
    };

    window.addEventListener('messageAdded', handleMessageAdded);
    return () => {
      window.removeEventListener('messageAdded', handleMessageAdded);
    };
  }, [currentPage, fetchMessages]);
  
  // Sync with prop changes (e.g., when navigating back to page 1)
  const prevInitialMessagesRef = useRef<string>(JSON.stringify(initialMessages));
  useEffect(() => {
    // Only update if we're on page 1, not initial mount, and props actually changed
    if (currentPage === 1 && !isInitialMount.current) {
      const currentInitialMessagesStr = JSON.stringify(initialMessages);
      if (currentInitialMessagesStr !== prevInitialMessagesRef.current) {
        setMessages(initialMessages);
        if (initialTotal !== undefined) {
          setTotalMessages(initialTotal);
        }
        setHasMore(initialMessages.length >= itemsPerPage);
        lastFetchedPage.current = 1;
        prevInitialMessagesRef.current = currentInitialMessagesStr;
      }
    }
  }, [initialMessages, initialTotal, itemsPerPage, currentPage]);

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

