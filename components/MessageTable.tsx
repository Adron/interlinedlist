'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { formatRelativeTime } from '@/lib/utils/relativeTime';
import { linkifyText } from '@/lib/messages/linkify';
import { Message as MessageType, LinkMetadataItem } from '@/lib/types';
import { detectLinks } from '@/lib/messages/link-detector';
import LinkMetadataCard from './messages/LinkMetadataCard';

interface MessageUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface Message extends Omit<MessageType, 'user'> {
  user: MessageUser;
}

interface MessageTableProps {
  initialMessages: Message[];
  initialTotal?: number;
  currentUserId?: string;
  itemsPerPage?: number;
  showPreviews?: boolean;
}

export default function MessageTable({ 
  initialMessages, 
  initialTotal,
  currentUserId,
  itemsPerPage = 12,
  showPreviews = true
}: MessageTableProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(initialTotal ?? initialMessages.length);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialMessages.length >= itemsPerPage);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showDeleteRepostModal, setShowDeleteRepostModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedPubliclyVisible, setEditedPubliclyVisible] = useState(false);
  const [localShowPreviews, setLocalShowPreviews] = useState(showPreviews);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  
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
      // Clear selection when page changes
      setSelectedMessages(new Set());
    }
  }, [currentPage, fetchMessages]);

  const handleDelete = useCallback(async (deletedMessageId: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting to delete message:', deletedMessageId);
      
      // Delete the message via API
      const deleteResponse = await fetch(`/api/messages/${deletedMessageId}`, {
        method: 'DELETE',
      });
      
      const responseData = await deleteResponse.json().catch(() => ({}));
      console.log('Delete response:', deleteResponse.status, responseData);
      
      if (!deleteResponse.ok) {
        throw new Error(responseData.error || 'Failed to delete message');
      }

      // Update local state after successful deletion
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
    // Remove from selection if selected
    setSelectedMessages((prev) => {
      const updated = new Set(prev);
      updated.delete(deletedMessageId);
      return updated;
    });
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, fetchMessages]);

  const handleSelectChange = useCallback((messageId: string, selected: boolean) => {
    // Only allow selecting messages that belong to the current user
    const message = messages.find((m) => m.id === messageId);
    if (message && message.user.id !== currentUserId) {
      return; // Don't allow selecting other users' messages
    }
    
    setSelectedMessages((prev) => {
      const updated = new Set(prev);
      if (selected) {
        updated.add(messageId);
      } else {
        updated.delete(messageId);
      }
      return updated;
    });
  }, [messages, currentUserId]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedMessages.size === 0) return;
    
    // Filter to only include messages owned by current user
    const ownedSelectedMessages = Array.from(selectedMessages).filter((messageId) => {
      const message = messages.find((m) => m.id === messageId);
      return message && message.user.id === currentUserId;
    });

    if (ownedSelectedMessages.length === 0) return;
    
    setIsLoading(true);
    try {
      const deletePromises = ownedSelectedMessages.map(async (messageId) => {
        const response = await fetch(`/api/messages/${messageId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error(`Failed to delete message ${messageId}`);
        }
        return messageId;
      });

      await Promise.all(deletePromises);
      
      // Refresh current page
      lastFetchedPage.current = null;
      await fetchMessages(currentPage, true);
      
      // Clear selection
      setSelectedMessages(new Set());
      setTotalMessages((prev) => Math.max(0, prev - ownedSelectedMessages.length));
    } catch (error) {
      console.error('Error deleting messages:', error);
      alert('Failed to delete some messages. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMessages, messages, currentUserId, currentPage, fetchMessages]);

  const handleDeleteAndRepost = useCallback(() => {
    if (selectedMessages.size !== 1) return;
    
    const messageId = Array.from(selectedMessages)[0];
    const message = messages.find((m) => m.id === messageId);
    
    if (!message || message.user.id !== currentUserId) return;
    
    // Open modal with message content
    setEditingMessage(message);
    setEditedContent(message.content);
    setEditedPubliclyVisible(message.publiclyVisible);
    setShowDeleteRepostModal(true);
  }, [selectedMessages, messages, currentUserId]);

  const handleDeleteAndPost = useCallback(async () => {
    if (!editingMessage) return;
    
    setIsLoading(true);
    try {
      console.log('Attempting to delete and repost message:', editingMessage.id);
      
      // Delete the message
      const deleteResponse = await fetch(`/api/messages/${editingMessage.id}`, {
        method: 'DELETE',
      });
      
      const deleteResponseData = await deleteResponse.json().catch(() => ({}));
      console.log('Delete response:', deleteResponse.status, deleteResponseData);
      
      if (!deleteResponse.ok) {
        throw new Error(deleteResponseData.error || 'Failed to delete message');
      }

      // Create a new message with edited content
      const createResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editedContent.trim(),
          publiclyVisible: editedPubliclyVisible,
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || 'Failed to repost message');
      }

      // Refresh current page
      lastFetchedPage.current = null;
      await fetchMessages(currentPage, true);
      
      // Clear selection and close modal
      setSelectedMessages(new Set());
      setShowDeleteRepostModal(false);
      setEditingMessage(null);
      setTotalMessages((prev) => prev); // Total stays same since we deleted and created
    } catch (error: any) {
      console.error('Error deleting and reposting message:', error);
      alert(error.message || 'Failed to delete and repost message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [editingMessage, editedContent, editedPubliclyVisible, currentPage, fetchMessages]);

  const handleDeleteOnly = useCallback(async () => {
    if (!editingMessage) return;
    
    setIsLoading(true);
    try {
      console.log('Attempting to delete message:', editingMessage.id);
      
      // Delete the message
      const deleteResponse = await fetch(`/api/messages/${editingMessage.id}`, {
        method: 'DELETE',
      });
      
      const responseData = await deleteResponse.json().catch(() => ({}));
      console.log('Delete response:', deleteResponse.status, responseData);
      
      if (!deleteResponse.ok) {
        throw new Error(responseData.error || 'Failed to delete message');
      }

      // Refresh current page
      lastFetchedPage.current = null;
      await fetchMessages(currentPage, true);
      
      // Clear selection and close modal
      setSelectedMessages(new Set());
      setShowDeleteRepostModal(false);
      setEditingMessage(null);
      setTotalMessages((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [editingMessage, currentPage, fetchMessages]);

  const handleCancelModal = useCallback(() => {
    setShowDeleteRepostModal(false);
    setEditingMessage(null);
    setEditedContent('');
    setEditedPubliclyVisible(false);
  }, []);

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
  
  // Sync local showPreviews state with prop changes
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

  // Action buttons component
  const renderActionButtons = () => {
    if (selectedMessages.size === 0) return null;

    // Filter to only include messages owned by current user
    const ownedSelectedMessages = Array.from(selectedMessages).filter((messageId) => {
      const message = messages.find((m) => m.id === messageId);
      return message && message.user.id === currentUserId;
    });

    if (ownedSelectedMessages.length === 0) return null;

    const selectedCount = ownedSelectedMessages.length;
    const isSingleSelection = selectedCount === 1;

    return (
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <span className="text-muted small">
          {selectedCount} {selectedCount === 1 ? 'message' : 'messages'} selected
        </span>
        <button
          className="btn btn-sm btn-danger"
          onClick={handleBulkDelete}
          disabled={isLoading}
          title="Delete selected messages"
        >
          <i className="bx bx-x" style={{ fontSize: '1rem' }}></i>
          <span className="ms-1">Delete</span>
        </button>
        {isSingleSelection && (
          <button
            className="btn btn-sm btn-primary"
            onClick={handleDeleteAndRepost}
            disabled={isLoading}
            title="Delete and repost message"
          >
            <i className="bx bx-recycle" style={{ fontSize: '1rem' }}></i>
            <span className="ms-1">Delete & Repost</span>
          </button>
        )}
      </div>
    );
  };

  // Pagination component
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <nav aria-label="Message pagination" className="mb-3">
        <ul className="pagination justify-content-center mb-0">
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
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-5">
            <p className="text-muted mb-0">No messages yet. Be the first to post!</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter to only include messages owned by current user for selection
  const ownedSelectedMessages = currentUserId 
    ? Array.from(selectedMessages).filter((messageId) => {
        const message = messages.find((m) => m.id === messageId);
        return message && message.user.id === currentUserId;
      })
    : [];
  const hasOwnedSelections = ownedSelectedMessages.length > 0;

  return (
    <>
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h4 className="card-title mb-0">Recent Messages</h4>
        {hasOwnedSelections ? renderActionButtons() : null}
      </div>
      {/* end card-header*/}

      <div className="card-body pb-1">
        {/* Preview toggle header */}
        <div className="d-flex justify-content-between align-items-center mb-2 px-0">
          <div></div>
          <div className="d-flex align-items-center gap-2">
            <small className="text-muted me-2">Message Previews:</small>
            <div className="d-flex gap-3">
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  name="messagePreviewsToggleDashboard"
                  id="showPreviewsToggleDashboard"
                  checked={localShowPreviews === true}
                  onChange={() => handlePreviewsToggleChange(true)}
                  disabled={isSavingPreference}
                />
                <label className="form-check-label" htmlFor="showPreviewsToggleDashboard">
                  Show
                </label>
              </div>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  name="messagePreviewsToggleDashboard"
                  id="hidePreviewsToggleDashboard"
                  checked={localShowPreviews === false}
                  onChange={() => handlePreviewsToggleChange(false)}
                  disabled={isSavingPreference}
                />
                <label className="form-check-label" htmlFor="hidePreviewsToggleDashboard">
                  Hide
                </label>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center mb-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : null}

        {/* Action buttons above table if no header actions */}
        {!hasOwnedSelections ? renderActionButtons() : null}

        <div className="table-responsive">
          <table className="table table-hover mb-0 table-centered" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                {currentUserId && (
                  <th style={{ width: '40px', padding: '0.25rem 0.5rem' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={hasOwnedSelections && ownedSelectedMessages.length === messages.filter(m => m.user.id === currentUserId).length}
                      onChange={(e) => {
                        const ownedMessages = messages.filter(m => m.user.id === currentUserId);
                        if (e.target.checked) {
                          setSelectedMessages(new Set(ownedMessages.map(m => m.id)));
                        } else {
                          setSelectedMessages(new Set());
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                      aria-label="Select all owned messages"
                    />
                  </th>
                )}
                <th style={{ padding: '0.25rem 0.5rem' }}>Date</th>
                <th style={{ padding: '0.25rem 0.5rem' }}>User</th>
                <th style={{ padding: '0.25rem 0.5rem' }}>Visibility</th>
                <th style={{ padding: '0.25rem 0.5rem' }}>Content</th>
                {currentUserId && <th style={{ padding: '0.25rem 0.5rem' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => {
                const isOwner = currentUserId === message.user.id;
                const isSelected = selectedMessages.has(message.id);
                const canSelect = isOwner && currentUserId;

                return (
                  <tr key={message.id} style={{ lineHeight: '1.3' }}>
                    {currentUserId && (
                      <td style={{ padding: '0.25rem 0.5rem' }}>
                        {canSelect ? (
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isSelected}
                            onChange={(e) => handleSelectChange(message.id, e.target.checked)}
                            style={{ cursor: 'pointer' }}
                            aria-label={`Select message from ${message.user.displayName || message.user.username}`}
                          />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    )}
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                        {formatRelativeTime(message.createdAt)}
                      </span>
                    </td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      <div className="d-flex align-items-center">
                        {message.user.avatar ? (
                          <img
                            src={message.user.avatar}
                            alt={message.user.displayName || message.user.username}
                            className="img-fluid avatar-xs rounded-circle me-1"
                            style={{ width: '24px', height: '24px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center me-1 avatar-xs"
                            style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: 'var(--bs-secondary)',
                              color: 'white',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              flexShrink: 0,
                            }}
                          >
                            {(message.user.displayName || message.user.username)[0].toUpperCase()}
                          </div>
                        )}
                        <span className="align-middle" style={{ fontSize: '0.85rem' }}>
                          {message.user.displayName || message.user.username}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      {message.publiclyVisible ? (
                        <span className="badge badge-soft-success" style={{ fontSize: '0.75rem' }}>Public</span>
                      ) : (
                        <span className="badge badge-soft-warning" style={{ fontSize: '0.75rem' }}>Private</span>
                      )}
                    </td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      <div 
                        className="text-break" 
                        style={{ 
                          maxWidth: '250px', 
                          whiteSpace: 'pre-wrap', 
                          wordBreak: 'break-word',
                          fontSize: '0.85rem'
                        }}
                      >
                        {message.content.length > 100 
                          ? linkifyText(message.content.substring(0, 100) + '...')
                          : linkifyText(message.content)}
                      </div>
                      {/* Render link previews for all detected links (if showPreviews is enabled) */}
                      {localShowPreviews && (() => {
                        // Detect all links in the message
                        const detectedLinks = detectLinks(message.content);
                        
                        if (detectedLinks.length === 0) {
                          return null;
                        }
                        
                        // Create a map of URLs to metadata for quick lookup
                        const metadataMap = new Map<string, LinkMetadataItem>();
                        if (message.linkMetadata?.links) {
                          message.linkMetadata.links.forEach(link => {
                            metadataMap.set(link.url, link);
                          });
                        }
                        
                        // Create link items with metadata if available, or pending status
                        const linkItems: LinkMetadataItem[] = detectedLinks.map(detected => {
                          const existing = metadataMap.get(detected.url);
                          if (existing) {
                            return existing;
                          }
                          // No metadata yet - create pending item
                          return {
                            url: detected.url,
                            platform: detected.platform,
                            fetchStatus: 'pending',
                          };
                        });
                        
                        return (
                          <div className="mt-2">
                            {linkItems.map((link, index) => (
                              <LinkMetadataCard key={`${link.url}-${index}`} link={link} messageId={message.id} />
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    {currentUserId && (
                      <td style={{ padding: '0.25rem 0.5rem' }}>
                        <div className="d-flex align-items-center gap-1">
                          <button
                            className="btn btn-sm btn-link text-primary p-0"
                            onClick={() => {
                              // Placeholder - will be implemented later
                              console.log('Create list for message:', message.id);
                            }}
                            disabled={isLoading}
                            title="Create list from this message"
                          >
                            <i className="bx bx-list-plus"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-link text-danger p-0"
                            onClick={async () => {
                              if (isOwner && window.confirm('Are you sure you want to delete this message?')) {
                                await handleDelete(message.id);
                              }
                            }}
                            disabled={isLoading || !isOwner}
                            title={isOwner ? "Delete message" : "You can only delete your own messages"}
                            style={{ opacity: isOwner ? 1 : 0.5 }}
                          >
                            <i className="bx bx-trash"></i>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {renderPagination()}
      </div>
      {/* end card body */}
    </div>
    {/* end card */}

    {/* Delete & Repost Modal */}
    {showDeleteRepostModal && editingMessage && (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Delete & Repost Message</h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleCancelModal}
                disabled={isLoading}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <p className="mb-3">Edit the message content below. The original message will be deleted.</p>
              
              <div className="mb-3">
                <label htmlFor="editContent" className="form-label">Message Content</label>
                <textarea
                  id="editContent"
                  className="form-control"
                  rows={6}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Enter your message..."
                  disabled={isLoading}
                  style={{
                    resize: 'vertical',
                    minHeight: '120px',
                  }}
                />
                <div className="form-text">
                  {editedContent.length} characters
                </div>
              </div>

              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="editPubliclyVisible"
                  checked={editedPubliclyVisible}
                  onChange={(e) => setEditedPubliclyVisible(e.target.checked)}
                  disabled={isLoading}
                />
                <label className="form-check-label" htmlFor="editPubliclyVisible">
                  Make this message public
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelModal}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteOnly}
                disabled={isLoading || !editedContent.trim()}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDeleteAndPost}
                disabled={isLoading || !editedContent.trim()}
              >
                {isLoading ? 'Processing...' : 'Delete & Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
