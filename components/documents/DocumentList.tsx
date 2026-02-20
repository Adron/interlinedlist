'use client';

import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  relativePath: string;
  content?: string;
  isPublic?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface DocumentListProps {
  documents: Document[];
  folderId?: string;
}

export default function DocumentList({ documents, folderId }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <i className="bx bx-file fs-1 text-muted mb-3 d-block"></i>
          <p className="text-muted mb-0">No documents in this folder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="list-group">
      {documents.map((doc) => (
        <Link
          key={doc.id}
          href={`/documents/${doc.id}`}
          className="list-group-item list-group-item-action d-flex align-items-center"
        >
          <i className="bx bx-file me-3 text-muted"></i>
          <div className="flex-grow-1">
            <div className="fw-medium">{doc.title || doc.relativePath}</div>
            {doc.updatedAt != null && (
              <small className="text-muted">
                Updated {new Date(doc.updatedAt as string | Date).toLocaleDateString()}
              </small>
            )}
          </div>
          <i className="bx bx-chevron-right text-muted"></i>
        </Link>
      ))}
    </div>
  );
}
