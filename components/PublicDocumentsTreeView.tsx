'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface DocItem {
  id: string;
  title: string;
  folderId: string | null;
  relativePath: string;
}

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
}

interface TreeNode {
  folder: FolderItem | null;
  documents: DocItem[];
  children: TreeNode[];
}

interface PublicDocumentsTreeViewProps {
  username: string;
}

function buildDocTree(docs: DocItem[], folders: FolderItem[]): TreeNode[] {
  const folderMap = new Map<string, TreeNode>();

  for (const folder of folders) {
    folderMap.set(folder.id, { folder, documents: [], children: [] });
  }

  for (const doc of docs) {
    if (doc.folderId && folderMap.has(doc.folderId)) {
      folderMap.get(doc.folderId)!.documents.push(doc);
    }
  }

  const roots: TreeNode[] = [];

  for (const folder of folders) {
    const node = folderMap.get(folder.id)!;
    if (folder.parentId && folderMap.has(folder.parentId)) {
      folderMap.get(folder.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const rootDocs = docs.filter((d) => d.folderId === null);
  if (rootDocs.length > 0) {
    roots.unshift({ folder: null, documents: rootDocs, children: [] });
  }

  return roots;
}

function DocTreeNodeComponent({
  node,
  username,
  expandedFolders,
  onToggle,
}: {
  node: TreeNode;
  username: string;
  expandedFolders: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (node.folder === null) {
    return (
      <>
        {node.documents.map((doc) => (
          <li key={doc.id} className="mb-1">
            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
              <i className="bx bx-file-blank me-2 text-muted flex-shrink-0"></i>
              <Link
                href={`/user/${encodeURIComponent(username)}/documents/${doc.id}`}
                className="text-decoration-none text-truncate"
                title={doc.title}
              >
                {doc.title}
              </Link>
            </div>
          </li>
        ))}
      </>
    );
  }

  const folderId = node.folder.id;
  const isExpanded = expandedFolders.has(folderId);
  const hasContent = node.documents.length > 0 || node.children.length > 0;

  return (
    <li className="mb-1">
      {hasContent ? (
        <button
          type="button"
          className="btn btn-link p-0 text-decoration-none text-start d-flex align-items-center w-100 border-0 bg-transparent"
          style={{ minWidth: 0 }}
          onClick={() => onToggle(folderId)}
          aria-expanded={isExpanded}
        >
          <i
            className={`bx ${isExpanded ? 'bx-chevron-down' : 'bx-chevron-right'} me-1 flex-shrink-0`}
            aria-hidden="true"
          ></i>
          <i className="bx bx-folder me-2 text-muted flex-shrink-0"></i>
          <span className="text-truncate">{node.folder.name}</span>
        </button>
      ) : (
        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
          <span style={{ width: '1.25rem', display: 'inline-block', flexShrink: 0 }} />
          <i className="bx bx-folder me-2 text-muted flex-shrink-0"></i>
          <span className="text-truncate">{node.folder.name}</span>
        </div>
      )}
      {isExpanded && hasContent && (
        <ul className="list-unstyled ms-4 mt-1 mb-0">
          {node.documents.map((doc) => (
            <li key={doc.id} className="mb-1">
              <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                <i className="bx bx-file-blank me-2 text-muted flex-shrink-0"></i>
                <Link
                  href={`/user/${encodeURIComponent(username)}/documents/${doc.id}`}
                  className="text-decoration-none text-truncate"
                  title={doc.title}
                >
                  {doc.title}
                </Link>
              </div>
            </li>
          ))}
          {node.children.map((child) => (
            <DocTreeNodeComponent
              key={child.folder!.id}
              node={child}
              username={username}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function PublicDocumentsTreeView({ username }: PublicDocumentsTreeViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/users/${encodeURIComponent(username)}/documents`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setError('User not found');
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch documents: ${res.statusText}`);
        }
        const data = await res.json();
        if (!cancelled) {
          const built = buildDocTree(data.documents ?? [], data.folders ?? []);
          setTree(built);
          const rootFolderIds = new Set<string>(
            built.filter((n) => n.folder !== null).map((n) => n.folder!.id)
          );
          setExpandedFolders(rootFolderIds);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load documents');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  const handleToggle = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalDocs = useMemo(() => tree.reduce((sum, n) => sum + n.documents.length, 0), [tree]);

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
          <button
            type="button"
            className="btn btn-link p-0 text-decoration-none text-start d-flex align-items-center mb-2 border-0 bg-transparent"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            <i
              className={`bx ${isExpanded ? 'bx-chevron-down' : 'bx-chevron-right'} me-2`}
              aria-hidden="true"
            ></i>
            <strong>Public Documents</strong>
          </button>

          {isExpanded && (
            <>
              {loading ? (
                <div className="text-muted small ms-3">Loading...</div>
              ) : error ? (
                <div className="text-danger small ms-3">{error}</div>
              ) : totalDocs === 0 && tree.length === 0 ? (
                <div className="text-muted small ms-3">No public documents</div>
              ) : (
                <ul className="list-unstyled ms-3 mb-0">
                  {tree.map((node, idx) => (
                    <DocTreeNodeComponent
                      key={node.folder ? node.folder.id : `root-${idx}`}
                      node={node}
                      username={username}
                      expandedFolders={expandedFolders}
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
