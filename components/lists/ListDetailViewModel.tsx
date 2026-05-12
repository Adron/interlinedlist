'use client';

import { useState } from 'react';
import ListDetailActions from './ListDetailActions';
import ListDataTable from './ListDataTable';
import ListAccessSection from './ListAccessSection';
import CreateDocFromListModal from './CreateDocFromListModal';
import { ParsedField } from '@/lib/lists/dsl-types';

const LIST_TO_DOC_ROW_LIMIT = 500;

interface ListDetailViewModelProps {
  listId: string;
  listTitle: string;
  isPublic: boolean;
  isGitHubList: boolean;
  fields: ParsedField[];
  listSource?: 'local' | 'github';
  githubRepo?: string;
  canCreateDocuments?: boolean;
}

export default function ListDetailViewModel({
  listId,
  listTitle,
  isPublic,
  isGitHubList,
  fields,
  listSource,
  githubRepo,
  canCreateDocuments = false,
}: ListDetailViewModelProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [listToDocOpen, setListToDocOpen] = useState(false);
  const [listToDocRows, setListToDocRows] = useState<Record<string, unknown>[]>([]);
  const [listToDocTotal, setListToDocTotal] = useState(0);
  const [listToDocLoading, setListToDocLoading] = useState(false);

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

  const handleListToDoc = async () => {
    setListToDocLoading(true);
    try {
      const res = await fetch(
        `/api/lists/${listId}/data?limit=${LIST_TO_DOC_ROW_LIMIT}&offset=0`
      );
      if (res.ok) {
        const data = await res.json();
        const rows = (data.rows as Array<{ rowData: Record<string, unknown> }>).map(
          (r) => r.rowData
        );
        setListToDocRows(rows);
        setListToDocTotal(data.pagination?.total ?? rows.length);
        setListToDocOpen(true);
      }
    } finally {
      setListToDocLoading(false);
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
            canCreateDocuments={canCreateDocuments}
            onListToDoc={handleListToDoc}
            listToDocLoading={listToDocLoading}
          />
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <ListDataTable
            listId={listId}
            listTitle={listTitle}
            canCreateDocuments={canCreateDocuments}
            fields={fields}
            refreshTrigger={refreshTrigger}
            listSource={listSource}
            githubRepo={githubRepo}
            listIsPublic={isPublic}
          />
          {isPublic && (
            <ListAccessSection listId={listId} isPublic={isPublic} />
          )}
        </div>
      </div>

      <CreateDocFromListModal
        open={listToDocOpen}
        onClose={() => setListToDocOpen(false)}
        listId={listId}
        listTitle={listTitle}
        fields={fields}
        rows={listToDocRows}
        totalRows={listToDocTotal}
      />
    </>
  );
}
