'use client';

import React, { useState, useEffect } from 'react';
import { LinkMetadataItem } from '@/lib/types';

interface LinkMetadataCardProps {
  link: LinkMetadataItem;
  messageId?: string;
}

// Helper function to decode HTML entities in URLs
function decodeUrlEntities(url: string): string {
  return url
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// Image component with proxy fallback for Instagram
function ImageWithProxy({ 
  src, 
  alt, 
  className, 
  style, 
  platform 
}: { 
  src: string; 
  alt: string; 
  className?: string; 
  style?: React.CSSProperties;
  platform: string;
}) {
  // Decode HTML entities in the source URL (e.g., &amp; -> &)
  const decodedSrc = decodeUrlEntities(src);
  const [imageSrc, setImageSrc] = useState(decodedSrc);
  const [hasError, setHasError] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);
  
  const handleError = () => {
    // If it's Instagram and we haven't tried proxy yet, try proxy
    if (platform === 'instagram' && !triedProxy && imageSrc === decodedSrc) {
      setTriedProxy(true);
      const proxyUrl = `/api/images/proxy?url=${encodeURIComponent(decodedSrc)}`;
      setImageSrc(proxyUrl);
      setHasError(false);
    } else {
      // Both direct and proxy failed, show placeholder
      setHasError(true);
    }
  };
  
  if (hasError) {
    // Show placeholder for failed images
    return (
      <div 
        className={className}
        style={{
          ...style,
          backgroundColor: 'var(--bs-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '150px',
          borderRadius: '0.375rem',
        }}
      >
        <div className="text-center p-3">
          <i className="bx bx-image text-muted" style={{ fontSize: '2rem' }}></i>
          <div className="text-muted small mt-2">Image unavailable</div>
        </div>
      </div>
    );
  }
  
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
    />
  );
}

export default function LinkMetadataCard({ link, messageId }: LinkMetadataCardProps) {
  const { url, platform, metadata: initialMetadata, fetchStatus: initialFetchStatus } = link;
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentLink, setCurrentLink] = useState<LinkMetadataItem>(link);
  
  // Auto-polling for pending metadata
  useEffect(() => {
    if (currentLink.fetchStatus !== 'pending' || !messageId) return;
    
    let attempts = 0;
    const maxAttempts = 10; // 30 seconds total (3s intervals)
    
    const pollInterval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(pollInterval);
        // Mark as failed if polling times out
        setCurrentLink(prev => ({
          ...prev,
          fetchStatus: 'failed',
        }));
        return;
      }
      
      try {
        const response = await fetch(`/api/messages/${messageId}`);
        if (!response.ok) return;
        
        const messageData = await response.json();
        // Find metadata for this specific link URL
        const linkMeta = messageData.linkMetadata?.links?.find((l: LinkMetadataItem) => l.url === url);
        
        if (linkMeta && linkMeta.fetchStatus !== 'pending') {
          // Update state with new metadata
          setCurrentLink(linkMeta);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
    
    return () => clearInterval(pollInterval);
  }, [currentLink.fetchStatus, messageId, url]);
  
  // Update currentLink when prop changes
  useEffect(() => {
    setCurrentLink(link);
  }, [link]);
  
  const { url: currentUrl, platform: currentPlatform, metadata, fetchStatus } = currentLink;
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  };
  
  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!messageId || isRetrying) return;
    
    setIsRetrying(true);
    try {
      const response = await fetch(`/api/messages/${messageId}/metadata`, {
        method: 'POST',
      });
      if (response.ok) {
        // Fetch updated message data
        const messageResponse = await fetch(`/api/messages/${messageId}`);
        if (messageResponse.ok) {
          const messageData = await messageResponse.json();
          const linkMeta = messageData.linkMetadata?.links?.find((l: LinkMetadataItem) => l.url === currentUrl);
          if (linkMeta) {
            setCurrentLink(linkMeta);
          }
        }
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };
  
  // Show pending state
  if (fetchStatus === 'pending') {
    try {
      const urlObj = new URL(currentUrl);
      return (
        <div
          className="mt-2 border rounded p-2"
          style={{
            backgroundColor: 'var(--bs-secondary-bg)',
            cursor: 'pointer',
            opacity: 0.7,
          }}
          onClick={handleClick}
        >
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status" style={{ width: '1rem', height: '1rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="flex-grow-1">
              <div className="fw-bold small">{urlObj.hostname}</div>
              <div className="text-muted small" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                {currentUrl}
              </div>
              <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
                Loading preview...
              </div>
            </div>
          </div>
        </div>
      );
    } catch {
      return null;
    }
  }
  
  // Show basic preview if metadata fetch failed or not available
  if (fetchStatus === 'failed' || !metadata) {
    try {
      const urlObj = new URL(currentUrl);
      return (
        <div
          className="mt-2 border rounded p-2"
          style={{
            backgroundColor: 'var(--bs-secondary-bg)',
            cursor: 'pointer',
          }}
          onClick={handleClick}
        >
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center flex-grow-1">
              <i className="bx bx-link-external text-primary me-2"></i>
              <div className="flex-grow-1">
                <div className="fw-bold small">{urlObj.hostname}</div>
                <div className="text-muted small" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {currentUrl}
                </div>
              </div>
            </div>
            {messageId && (
              <button
                className="btn btn-sm btn-link text-primary p-1 ms-2"
                onClick={handleRetry}
                disabled={isRetrying}
                title="Retry fetching preview"
                style={{ fontSize: '0.75rem' }}
              >
                <i className={`bx ${isRetrying ? 'bx-loader-alt bx-spin' : 'bx-refresh'}`}></i>
              </button>
            )}
          </div>
        </div>
      );
    } catch {
      // Invalid URL, show basic link
      return (
        <div
          className="mt-2 border rounded p-2"
          style={{
            backgroundColor: 'var(--bs-secondary-bg)',
            cursor: 'pointer',
          }}
          onClick={handleClick}
        >
          <div className="d-flex align-items-center">
            <i className="bx bx-link-external text-primary me-2"></i>
            <div className="text-muted small" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
              {currentUrl}
            </div>
          </div>
        </div>
      );
    }
  }
  
  // Render based on platform type
  switch (metadata.type) {
    case 'image':
      // Instagram-style image preview
      return (
        <div
          className="mt-2 border rounded p-2"
          style={{
            backgroundColor: 'var(--bs-secondary-bg)',
            cursor: 'pointer',
            maxWidth: '100%',
          }}
          onClick={handleClick}
        >
          {metadata.thumbnail && (
            <ImageWithProxy
              src={metadata.thumbnail}
              alt={metadata.title || 'Link preview'}
              className="img-fluid rounded mb-2"
              style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
              platform={currentPlatform}
            />
          )}
          {metadata.title && (
            <div className="fw-bold small mb-1">{metadata.title}</div>
          )}
          {metadata.description && (
            <div className="text-muted small" style={{ fontSize: '0.85rem' }}>
              {metadata.description}
            </div>
          )}
          <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
            {new URL(currentUrl).hostname}
          </div>
        </div>
      );
      
    case 'quote':
      // Blue Sky quote post - show post content prominently
      return (
        <div
          className="mt-2 border-start border-primary ps-3 py-2"
          style={{
            backgroundColor: 'var(--bs-secondary-bg)',
            cursor: 'pointer',
            borderLeftWidth: '3px !important',
          }}
          onClick={handleClick}
        >
          <div className="d-flex align-items-center mb-2">
            <i className="bx bx-quote-alt-left text-primary me-2"></i>
            <span className="text-muted small fw-bold">Blue Sky Post</span>
          </div>
          {/* Show post content prominently */}
          {metadata.text && (
            <div 
              className="mb-2" 
              style={{ 
                fontSize: '0.95rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {metadata.text}
            </div>
          )}
          {metadata.thumbnail && (
            <ImageWithProxy
              src={metadata.thumbnail}
              alt={metadata.text || metadata.title || 'Blue Sky post image'}
              className="img-fluid rounded mb-2"
              style={{ maxHeight: '250px', width: '100%', objectFit: 'cover' }}
              platform={currentPlatform}
            />
          )}
          {metadata.title && !metadata.text && (
            <div className="fw-bold small mb-1">{metadata.title}</div>
          )}
        </div>
      );
      
    case 'rethread':
      // Threads rethread - show post content prominently
      return (
        <div
          className="mt-2 border-start border-info ps-3 py-2"
          style={{
            backgroundColor: 'var(--bs-secondary-bg)',
            cursor: 'pointer',
            borderLeftWidth: '3px !important',
          }}
          onClick={handleClick}
        >
          <div className="d-flex align-items-center mb-2">
            <i className="bx bx-repost text-info me-2"></i>
            <span className="text-muted small fw-bold">Threads Post</span>
          </div>
          {/* Show post content prominently */}
          {metadata.text && (
            <div 
              className="mb-2" 
              style={{ 
                fontSize: '0.95rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {metadata.text}
            </div>
          )}
          {metadata.thumbnail && (
            <ImageWithProxy
              src={metadata.thumbnail}
              alt={metadata.text || metadata.title || 'Threads post image'}
              className="img-fluid rounded mb-2"
              style={{ maxHeight: '250px', width: '100%', objectFit: 'cover' }}
              platform={currentPlatform}
            />
          )}
          {metadata.title && !metadata.text && (
            <div className="fw-bold small mb-1">{metadata.title}</div>
          )}
        </div>
      );
      
    case 'repost':
      // Mastodon repost/boost - show post content prominently
      return (
        <div
          className="mt-2 border-start border-success ps-3 py-2"
          style={{
            backgroundColor: 'var(--bs-secondary-bg)',
            cursor: 'pointer',
            borderLeftWidth: '3px !important',
          }}
          onClick={handleClick}
        >
          <div className="d-flex align-items-center mb-2">
            <i className="bx bx-share-alt text-success me-2"></i>
            <span className="text-muted small fw-bold">Mastodon Post</span>
          </div>
          {/* Show post content prominently first */}
          {metadata.text && (
            <div 
              className="mb-2" 
              style={{ 
                fontSize: '0.95rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {metadata.text}
            </div>
          )}
          {/* Show image after text for better content flow */}
          {metadata.thumbnail && (
            <ImageWithProxy
              src={metadata.thumbnail}
              alt={metadata.text || metadata.title || 'Mastodon post image'}
              className="img-fluid rounded mb-2"
              style={{ maxHeight: '250px', width: '100%', objectFit: 'cover' }}
              platform={currentPlatform}
            />
          )}
          {metadata.title && !metadata.text && (
            <div className="fw-bold small mb-1">{metadata.title}</div>
          )}
        </div>
      );
      
    default:
      // Generic link preview
      return (
        <div
          className="mt-2 border rounded p-2"
          style={{
            backgroundColor: 'var(--bs-secondary-bg)',
            cursor: 'pointer',
          }}
          onClick={handleClick}
        >
          {metadata.thumbnail && (
            <ImageWithProxy
              src={metadata.thumbnail}
              alt={metadata.title || 'Link preview'}
              className="img-fluid rounded mb-2"
              style={{ maxHeight: '150px', width: '100%', objectFit: 'cover' }}
              platform={currentPlatform}
            />
          )}
          {metadata.title && (
            <div className="fw-bold small mb-1">{metadata.title}</div>
          )}
          {metadata.description && (
            <div className="text-muted small" style={{ fontSize: '0.85rem' }}>
              {metadata.description}
            </div>
          )}
          <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
            {new URL(currentUrl).hostname}
          </div>
        </div>
      );
  }
}
