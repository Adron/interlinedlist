'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ListDetailActions from './ListDetailActions';
import ListDataTable from './ListDataTable';
import ListAccessSection from './ListAccessSection';
import { ParsedField } from '@/lib/lists/dsl-types';

interface ListDetailViewModelProps {
  listId: string;
  listTitle: string;
  isPublic: boolean;
  isGitHubList: boolean;
  fields: ParsedField[];
  listSource?: 'local' | 'github';
  githubRepo?: string;
}

export default function ListDetailViewModel({
  listId,
  listTitle,
  isPublic,
  isGitHubList,
  fields,
  listSource,
  githubRepo,
}: ListDetailViewModelProps) {
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/lists/${listId}/refresh`, { method: 'POST' });
      if (res.ok) {
        setRefreshTrigger((t) => t + 1);
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-end">
          <ListDetailActions
            listId={listId}
            listTitle={listTitle}
            isEditMode={false}
            isAddMode={false}
            isGitHubList={isGitHubList}
            githubRepo={githubRepo}
            onRefresh={isGitHubList ? handleRefresh : undefined}
            refreshing={refreshing}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-12">
          <ListDataTable
            listId={listId}
            fields={fields}
            refreshTrigger={refreshTrigger}
            listSource={listSource}
            githubRepo={githubRepo}
          />
          {isPublic && (
            <ListAccessSection listId={listId} isPublic={isPublic} />
          )}
        </div>
      </div>
    </>
  );
}
