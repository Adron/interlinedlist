'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  children: Folder[];
  documents: { id: string; title: string; relativePath: string }[];
}

export default function FolderTree() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [rootDocuments, setRootDocuments] = useState<{ id: string; title: string; relativePath: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [foldersRes, docsRes] = await Promise.all([
        fetch('/api/documents/folders'),
        fetch('/api/documents'),
      ]);
      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setFolders(data.folders || []);
        setExpanded(new Set((data.folders || []).map((f: Folder) => f.id)));
      }
      if (docsRes.ok) {
        const data = await docsRes.json();
        setRootDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      <div className="text-muted small">
        <i className="bx bx-loader-alt bx-spin me-2"></i>
        Loading...
      </div>
    );
  }

  function renderFolder(folder: Folder) {
    const isExp = expanded.has(folder.id);
    const hasChildren = (folder.children?.length ?? 0) > 0 || (folder.documents?.length ?? 0) > 0;

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
        <h6 className="card-title mb-3">
          <i className="bx bx-folder me-2"></i>
          Documents
        </h6>
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
