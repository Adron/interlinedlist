'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function NewDocumentInFolderPage() {
  const router = useRouter();
  const params = useParams();
  const folderId = params.id as string;
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/folders/${folderId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Untitled',
          content: '',
          relativePath: title.trim() ? `${title.trim().replace(/\s+/g, '-').toLowerCase()}.md` : 'untitled.md',
        }),
      });
      const data = await res.json();
      if (res.ok && data.document) {
        router.push(`/documents/${data.document.id}`);
      } else {
        setError(data.error || 'Failed to create document');
      }
    } catch (err) {
      setError('Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <nav aria-label="breadcrumb" className="mb-3">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link href="/documents">Documents</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href={`/documents/folders/${folderId}`}>Folder</Link>
              </li>
              <li className="breadcrumb-item active">New Document</li>
            </ol>
          </nav>
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-4">Create New Document</h5>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document title"
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="alert alert-danger py-2">{error}</div>
                )}
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                  <Link href={`/documents/folders/${folderId}`} className="btn btn-outline-secondary">
                    Cancel
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
