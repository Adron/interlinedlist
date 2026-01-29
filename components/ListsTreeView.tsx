'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { List } from '@/lib/types';
import { buildListTree, TreeNode } from '@/lib/lists/queries';

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
}

function TreeNodeComponent({ node, level, expandedNodes, onToggle }: TreeNodeComponentProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.list.id);

  return (
    <li className="mb-1">
      <div className="d-flex align-items-center">
        {hasChildren ? (
          <div
            className="d-flex align-items-center"
            style={{ cursor: 'pointer' }}
            onClick={() => onToggle(node.list.id)}
          >
            <i className={`bx ${isExpanded ? 'bx-chevron-down' : 'bx-chevron-right'} me-2`}></i>
            <i className="bx bx-folder me-2 text-muted"></i>
            <Link href={`/lists/${node.list.id}`} className="text-decoration-none">
              {node.list.title}
            </Link>
          </div>
        ) : (
          <>
            <i className="bx bx-folder me-2 text-muted"></i>
            <Link href={`/lists/${node.list.id}`} className="text-decoration-none">
              {node.list.title}
            </Link>
          </>
        )}
      </div>
      {hasChildren && isExpanded && (
        <ul className="list-unstyled ms-4 mt-1 mb-0">
          {node.children.map((child) => (
            <TreeNodeComponent
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

export default function ListsTreeView() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<TreeNode[]>([]);

  useEffect(() => {
    const fetchLists = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/lists?limit=100');
        if (response.ok) {
          const data = await response.json();
          setLists(data.lists || []);
          // Build tree structure
          const treeData = buildListTree(data.lists || []);
          setTree(treeData);
          // Expand root nodes by default
          const rootIds = new Set(treeData.map((node) => node.list.id));
          setExpandedNodes(rootIds);
        }
      } catch (err) {
        console.error('Failed to fetch lists:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, []);

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
        <div className="lists-treeview">
          <div
            className="treeview-root d-flex align-items-center mb-2"
            style={{ cursor: 'pointer' }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <i className={`bx ${isExpanded ? 'bx-chevron-down' : 'bx-chevron-right'} me-2`}></i>
            <strong>Lists</strong>
          </div>

          {isExpanded && (
            <>
              {loading ? (
                <div className="text-muted small ms-3">Loading...</div>
              ) : tree.length === 0 ? (
                <div className="text-muted small ms-3">No lists found</div>
              ) : (
                <ul className="list-unstyled ms-3 mb-0">
                  {tree.map((node) => (
                    <TreeNodeComponent
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
