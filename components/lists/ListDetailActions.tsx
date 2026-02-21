'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DeleteListButton from './DeleteListButton';

interface ListDetailActionsProps {
  listId: string;
  listTitle: string;
  isEditMode: boolean;
  isAddMode: boolean;
}

export default function ListDetailActions({
  listId,
  listTitle,
  isEditMode,
  isAddMode,
}: ListDetailActionsProps) {
  const router = useRouter();

  return (
    <div className="d-flex gap-2">
      {!isEditMode && !isAddMode && (
        <>
          <Link
            href={`/lists/${listId}?edit=true`}
            className="btn btn-outline-secondary"
          >
            <i className="bx bx-edit me-1"></i>
            Edit Schema
          </Link>
          <Link
            href={`/lists/${listId}?add=true`}
            className="btn btn-primary"
          >
            <i className="bx bx-plus me-1"></i>
            Add Row
          </Link>
          <DeleteListButton
            listId={listId}
            listTitle={listTitle}
            onDeleteSuccess={() => router.push('/lists')}
            showLabel
          />
        </>
      )}
      {isEditMode && (
        <Link
          href={`/lists/${listId}`}
          className="btn btn-outline-secondary"
        >
          <i className="bx bx-x me-1"></i>
          Cancel Edit
        </Link>
      )}
      {isAddMode && (
        <Link
          href={`/lists/${listId}`}
          className="btn btn-outline-secondary"
        >
          <i className="bx bx-x me-1"></i>
          Cancel
        </Link>
      )}
    </div>
  );
}
