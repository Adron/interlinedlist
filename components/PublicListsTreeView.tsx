'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { List } from '@/lib/types';
import { buildListTree, TreeNode } from '@/lib/lists/queries';

interface PublicListsTreeViewProps {
  username: string;
}

interface PublicTreeNodeComponentProps {
  node: TreeNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
}

function PublicTreeNodeComponent({ node, level, expandedNodes, onToggle }: PublicTreeNodeComponentProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.list.id);

  return (
    <li className="mb-1" style={{ minWidth: 0 }}>
      <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
        <div className="d-flex align-items-center flex-grow-1" style={{ minWidth: 0, overflow: 'hidden' }}>
          {hasChildren ? (
            <div
              className="d-flex align-items-center"
              style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}
              onClick={() => onToggle(node.list.id)}
            >
              <i className={`bx ${isExpanded ? 'bx-chevron-down' : 'bx-chevron-right'} me-2`} style={{ flexShrink: 0 }}></i>
              <i className="bx bx-folder me-2 text-muted" style={{ flexShrink: 0 }}></i>
              <Link 
                href={`/lists/${node.list.id}`} 
                className="text-decoration-none text-truncate"
                style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                data-bs-toggle="tooltip"
                data-bs-placement="top"
                data-bs-title={node.list.title}
                title={node.list.title}
              >
                {node.list.title}
              </Link>
            </div>
          ) : (
            <div className="d-flex align-items-center" style={{ minWidth: 0, flex: 1 }}>
              <i className="bx bx-folder me-2 text-muted" style={{ flexShrink: 0 }}></i>
              <Link 
                href={`/lists/${node.list.id}`} 
                className="text-decoration-none text-truncate"
                style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                data-bs-toggle="tooltip"
                data-bs-placement="top"
                data-bs-title={node.list.title}
                title={node.list.title}
              >
                {node.list.title}
              </Link>
            </div>
          )}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <ul className="list-unstyled ms-4 mt-1 mb-0" style={{ minWidth: 0 }}>
          {node.children.map((child) => (
            <PublicTreeNodeComponent
              key={child.list.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function PublicListsTreeView({ username }: PublicListsTreeViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);

  const fetchLists = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists?limit=100`);
      if (response.status === 404) {
        setError('User not found');
        setLists([]);
        setTree([]);
        return;
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch lists: ${response.statusText}`);
      }
      const data = await response.json();
      const userLists = data.lists || [];
      setLists(userLists);
      // Build tree structure
      const treeData = buildListTree(userLists);
      setTree(treeData);
      // Expand root nodes by default
      const rootIds = new Set(treeData.map((node) => node.list.id));
      setExpandedNodes(rootIds);
    } catch (err: any) {
      console.error('Failed to fetch public lists:', err);
      setError(err.message || 'Failed to load lists');
      setLists([]);
      setTree([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [username]);

  // Initialize Bootstrap tooltips for list names
  useEffect(() => {
    // Only initialize tooltips if Bootstrap is available and tree is rendered
    if (typeof window !== 'undefined' && (window as any).bootstrap && tree.length > 0 && !loading) {
      // Use setTimeout to ensure DOM is fully updated
      const timeoutId = setTimeout(() => {
        // Find tooltip elements only within this component
        const treeviewContainer = document.querySelector('.public-lists-treeview');
        if (!treeviewContainer) return;

        // Dispose existing tooltips first (only within this component)
        const existingTooltips = treeviewContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
        existingTooltips.forEach((el) => {
          const existingTooltip = (window as any).bootstrap.Tooltip.getInstance(el);
          if (existingTooltip) {
            existingTooltip.dispose();
          }
        });

        // Initialize new tooltips (only within this component)
        const tooltipTriggerList = treeviewContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach((tooltipTriggerEl) => {
          // Only initialize if not already initialized
          if (!(window as any).bootstrap.Tooltip.getInstance(tooltipTriggerEl)) {
            new (window as any).bootstrap.Tooltip(tooltipTriggerEl);
          }
        });
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        // Cleanup tooltips on unmount or when tree changes
        const treeviewContainer = document.querySelector('.public-lists-treeview');
        if (treeviewContainer) {
          const tooltipTriggerList = treeviewContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
          tooltipTriggerList.forEach((el) => {
            const tooltip = (window as any).bootstrap.Tooltip.getInstance(el);
            if (tooltip) {
              tooltip.dispose();
            }
          });
        }
      };
    }
  }, [tree, loading]); // Re-initialize when tree or loading state changes

  const handleToggle = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="public-lists-treeview" style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'hidden' }}>
          <div
            className="treeview-root d-flex align-items-center mb-2"
            style={{ cursor: 'pointer' }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <i className={`bx ${isExpanded ? 'bx-chevron-down' : 'bx-chevron-right'} me-2`}></i>
            <strong>Public Lists</strong>
          </div>

          {isExpanded && (
            <>
              {loading ? (
                <div className="text-muted small ms-3">Loading...</div>
              ) : error ? (
                <div className="text-danger small ms-3">{error}</div>
              ) : tree.length === 0 ? (
                <div className="text-muted small ms-3">No public lists</div>
              ) : (
                <ul className="list-unstyled ms-3 mb-0">
                  {tree.map((node) => (
                    <PublicTreeNodeComponent
                      key={node.list.id}
                      node={node}
                      level={0}
                      expandedNodes={expandedNodes}
                      onToggle={handleToggle}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
