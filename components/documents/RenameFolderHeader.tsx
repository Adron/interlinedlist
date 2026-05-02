'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RenameFolderInput from './RenameFolderInput';
import DeleteFolderModal from './DeleteFolderModal';

interface RenameFolderHeaderProps {
  folderId: string;
  initialName: string;
  hasContents: boolean;
}

export default function RenameFolderHeader({
  folderId,
  initialName,
  hasContents,
}: RenameFolderHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState(initialName);
  const router = useRouter();

  const handleSave = async (newName: string) => {
    const res = await fetch(`/api/documents/folders/${folderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to rename folder');
    }

    setName(newName);
    setIsEditing(false);
    router.refresh();
  };

  if (isEditing) {
    return (
      <RenameFolderInput
        folderId={folderId}
        initialName={name}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <>
      <div className="d-flex align-items-center gap-2">
        <h1 className="h3 mb-0">
          <i className="bx bx-folder me-2 text-warning"></i>
          {name}
        </h1>
        <button
          type="button"
          className="btn btn-link btn-sm p-0 text-muted"
          title="Rename folder"
          onClick={() => setIsEditing(true)}
        >
          <i className="bx bx-pencil"></i>
        </button>
        <button
          type="button"
          className="btn btn-link btn-sm p-0 text-danger"
          title="Delete folder"
          onClick={() => setIsDeleting(true)}
        >
          <i className="bx bx-trash"></i>
        </button>
      </div>

      {isDeleting && (
        <DeleteFolderModal
          folderId={folderId}
          folderName={name}
          hasContents={hasContents}
          onClose={() => setIsDeleting(false)}
        />
      )}
    </>
  );
}
