'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDocumentsTreeRefresh } from '@/components/documents/DocumentsTreeContext';

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  children: Folder[];
  documents: { id: string; title: string; relativePath: string }[];
}

export default function FolderTree() {
  const pathname = usePathname();
  const { refreshVersion } = useDocumentsTreeRefresh();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [rootDocuments, setRootDocuments] = useState<
    { id: string; title: string; relativePath: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const hasCompletedInitialLoadRef = useRef(false);

  useEffect(() => {
    const useFullLoading = !hasCompletedInitialLoadRef.current;

    let cancelled = false;

    const run = async () => {
      if (useFullLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        const [foldersRes, docsRes] = await Promise.all([
          fetch('/api/documents/folders'),
          fetch('/api/documents'),
        ]);
        if (cancelled) return;
        if (foldersRes.ok) {
          const data = await foldersRes.json();
          const nextFolders: Folder[] = data.folders || [];
          setFolders(nextFolders);
          if (useFullLoading) {
            setExpanded(new Set(nextFolders.map((f) => f.id)));
          }
        }
        if (docsRes.ok) {
          const data = await docsRes.json();
          if (!cancelled) {
            setRootDocuments(data.documents || []);
          }
        }
        if (!cancelled) {
          hasCompletedInitialLoadRef.current = true;
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err);
      } finally {
        if (useFullLoading) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [pathname, refreshVersion]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <h6 className="card-title mb-3">
            <i className="bx bx-folder me-2"></i>
            Documents
          </h6>
          <p className="text-muted small mb-0">Loading…</p>
        </div>
      </div>
    );
  }

  function renderFolder(folder: Folder) {
    const isExp = expanded.has(folder.id);
    const hasChildren =
      (folder.children?.length ?? 0) > 0 || (folder.documents?.length ?? 0) > 0;

    return (
      <div key={folder.id} className="mb-1">
        <div className="d-flex align-items-center">
          {hasChildren ? (
            <span
              onClick={() => toggle(folder.id)}
              className="me-1"
              style={{ cursor: 'pointer' }}
            >
              <i className={`bx ${isExp ? 'bx-chevron-down' : 'bx-chevron-right'}`}></i>
            </span>
          ) : (
            <span className="me-1" style={{ width: '1em' }}></span>
          )}
          <i className="bx bx-folder me-2 text-warning"></i>
          <Link
            href={`/documents/folders/${folder.id}`}
            className="text-decoration-none text-truncate"
          >
            {folder.name}
          </Link>
        </div>
        {isExp && hasChildren && (
          <div className="ms-4">
            {(folder.children || []).map(renderFolder)}
            {(folder.documents || []).map((doc) => (
              <div key={doc.id} className="d-flex align-items-center mb-1">
                <span className="me-1" style={{ width: '1em' }}></span>
                <i className="bx bx-file me-2 text-muted"></i>
                <Link
                  href={`/documents/${doc.id}`}
                  className="text-decoration-none text-truncate"
                >
                  {doc.title || doc.relativePath}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="card-title mb-0">
            <i className="bx bx-folder me-2"></i>
            Documents
          </h6>
          {refreshing && (
            <span className="small text-muted" aria-live="polite">
              Updating…
            </span>
          )}
        </div>
        {folders.map(renderFolder)}
        {rootDocuments.length > 0 && (
          <div className="mt-2">
            <small className="text-muted d-block mb-1">Root</small>
            {rootDocuments.map((doc) => (
              <div key={doc.id} className="d-flex align-items-center mb-1">
                <i className="bx bx-file me-2 text-muted"></i>
                <Link
                  href={`/documents/${doc.id}`}
                  className="text-decoration-none text-truncate"
                >
                  {doc.title || doc.relativePath}
                </Link>
              </div>
            ))}
          </div>
        )}
        {folders.length === 0 && rootDocuments.length === 0 && (
          <p className="text-muted small mb-0">No documents yet.</p>
        )}
      </div>
    </div>
  );
}
