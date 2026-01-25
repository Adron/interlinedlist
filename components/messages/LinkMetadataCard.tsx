'use client';

import React from 'react';
import { LinkMetadataItem } from '@/lib/types';

interface LinkMetadataCardProps {
  link: LinkMetadataItem;
}

export default function LinkMetadataCard({ link }: LinkMetadataCardProps) {
  const { url, platform, metadata, fetchStatus } = link;
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  // Show basic preview if metadata fetch failed or not available
  if (fetchStatus === 'failed' || !metadata) {
    try {
      const urlObj = new URL(url);
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
            <div className="flex-grow-1">
              <div className="fw-bold small">{urlObj.hostname}</div>
              <div className="text-muted small" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                {url}
              </div>
            </div>
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
              {url}
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
            <img
              src={metadata.thumbnail}
              alt={metadata.title || 'Link preview'}
              className="img-fluid rounded mb-2"
              style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
              onError={(e) => {
                // Hide image on error
                e.currentTarget.style.display = 'none';
              }}
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
            {new URL(url).hostname}
          </div>
        </div>
      );
      
    case 'quote':
      // Blue Sky quote post
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
          <div className="d-flex align-items-center mb-1">
            <i className="bx bx-quote-alt-left text-primary me-2"></i>
            <span className="text-muted small fw-bold">Quote Post</span>
          </div>
          {metadata.thumbnail && (
            <img
              src={metadata.thumbnail}
              alt={metadata.title || 'Quote preview'}
              className="img-fluid rounded mb-2"
              style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          {metadata.text && (
            <div className="small" style={{ fontSize: '0.9rem' }}>
              {metadata.text}
            </div>
          )}
          {metadata.title && (
            <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
              {metadata.title}
            </div>
          )}
        </div>
      );
      
    case 'rethread':
      // Threads rethread
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
          <div className="d-flex align-items-center mb-1">
            <i className="bx bx-repost text-info me-2"></i>
            <span className="text-muted small fw-bold">Rethread</span>
          </div>
          {metadata.text && (
            <div className="small" style={{ fontSize: '0.9rem' }}>
              {metadata.text}
            </div>
          )}
          {metadata.thumbnail && (
            <img
              src={metadata.thumbnail}
              alt=""
              className="img-fluid rounded mt-2"
              style={{ maxHeight: '150px', width: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
        </div>
      );
      
    case 'repost':
      // Mastodon repost/boost
      // Show image prominently if available, otherwise show as text quote
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
          <div className="d-flex align-items-center mb-1">
            <i className="bx bx-share-alt text-success me-2"></i>
            <span className="text-muted small fw-bold">Mastodon Post</span>
          </div>
          {/* Show image first if available for better visual impact */}
          {metadata.thumbnail && (
            <img
              src={metadata.thumbnail}
              alt={metadata.title || metadata.text || 'Mastodon post image'}
              className="img-fluid rounded mb-2"
              style={{ maxHeight: '250px', width: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          {metadata.text && (
            <div className="small" style={{ fontSize: '0.9rem' }}>
              {metadata.text}
            </div>
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
            <img
              src={metadata.thumbnail}
              alt={metadata.title || 'Link preview'}
              className="img-fluid rounded mb-2"
              style={{ maxHeight: '150px', width: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
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
            {new URL(url).hostname}
          </div>
        </div>
      );
  }
}
