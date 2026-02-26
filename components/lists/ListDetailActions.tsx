'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DeleteListButton from './DeleteListButton';

interface ListDetailActionsProps {
  listId: string;
  listTitle: string;
  isEditMode: boolean;
  isAddMode: boolean;
  isGitHubList?: boolean;
  githubRepo?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function ListDetailActions({
  listId,
  listTitle,
  isEditMode,
  isAddMode,
  isGitHubList = false,
  githubRepo,
  onRefresh,
  refreshing = false,
}: ListDetailActionsProps) {
  const router = useRouter();

  const issuesUrl = githubRepo ? `https://github.com/${githubRepo}/issues` : null;

  return (
    <div className="d-flex gap-2 flex-wrap align-items-center">
      {isGitHubList && issuesUrl && (
        <a
          href={issuesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="badge bg-dark text-decoration-none"
        >
          <i className="bx bxl-github me-1"></i>
          GitHub
        </a>
      )}
      {!isEditMode && !isAddMode && (
        <>
          {!isGitHubList && (
            <Link
              href={`/lists/${listId}?edit=true`}
              className="btn btn-outline-secondary"
            >
              <i className="bx bx-edit me-1"></i>
              Edit Schema
            </Link>
          )}
          {isGitHubList && onRefresh && (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <i className={`bx ${refreshing ? 'bx-loader-alt bx-spin' : 'bx-refresh'} me-1`}></i>
              {refreshing ? 'Refreshing...' : 'Refresh from GitHub'}
            </button>
          )}
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
