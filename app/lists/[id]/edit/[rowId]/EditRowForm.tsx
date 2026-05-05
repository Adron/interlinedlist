'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import DynamicListForm from '@/components/lists/DynamicListForm';
import CreateDocFromRowModal from '@/components/lists/CreateDocFromRowModal';
import { ParsedField } from '@/lib/lists/dsl-types';
import { buildRowMarkdownMarkdown, buildExportDocumentPaths } from '@/lib/lists/row-to-markdown';

/** Row shape from getListDataRowById (Prisma `JsonValue` or GitHub cache object) */
interface EditRowSourceRow {
  id: string;
  rowData: unknown;
}

function rowDataAsRecord(rowData: unknown): Record<string, unknown> {
  if (rowData && typeof rowData === 'object' && !Array.isArray(rowData)) {
    return rowData as Record<string, unknown>;
  }
  return {};
}

interface EditRowFormProps {
  listId: string;
  rowId: string;
  /** List display title — used for row → document export headings and path */
  listTitle: string;
  fields: ParsedField[];
  initialRowData: { rowData: Record<string, any> };
  listSource?: 'local' | 'github';
  githubRepo?: string;
  row: EditRowSourceRow;
}

export default function EditRowForm({
  listId,
  rowId,
  listTitle,
  fields,
  initialRowData,
  listSource,
  githubRepo,
  row,
}: EditRowFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldsWithOptions, setFieldsWithOptions] = useState<ParsedField[]>(fields);
  const [docExport, setDocExport] = useState<{ markdown: string; title: string; relativePath: string } | null>(null);

  useEffect(() => {
    if (listSource !== 'github' || !githubRepo) {
      setFieldsWithOptions(fields);
      return;
    }
    const [owner, repo] = githubRepo.split('/');
    if (!owner || !repo) {
      setFieldsWithOptions(fields);
      return;
    }
    Promise.all([
      fetch(`/api/github/repos/${owner}/${repo}/labels`).then((r) => r.json()),
      fetch(`/api/github/repos/${owner}/${repo}/assignees`).then((r) => r.json()),
    ]).then(([labelsData, assigneesData]) => {
      const labels = Array.isArray(labelsData) ? labelsData.map((l: { name?: string }) => l.name).filter(Boolean) : [];
      const assignees = Array.isArray(assigneesData) ? assigneesData.map((a: { login?: string }) => a.login).filter(Boolean) : [];
      setFieldsWithOptions(
        fields.map((f) => {
          if (f.propertyKey === 'labels' && labels.length > 0) {
            return { ...f, validationRules: { ...f.validationRules, options: labels } };
          }
          if (f.propertyKey === 'assignees' && assignees.length > 0) {
            return { ...f, validationRules: { ...f.validationRules, options: assignees } };
          }
          return f;
        })
      );
    }).catch(() => setFieldsWithOptions(fields));
  }, [listSource, githubRepo, fields]);

  const handleSubmit = async (data: Record<string, any>) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/lists/${listId}/data/${rowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update row');
      }

      router.push(`/lists/${listId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update row');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/lists/${listId}`);
  };

  const handleCreateDocument = () => {
    const markdown = buildRowMarkdownMarkdown({
      listTitle,
      fields: fieldsWithOptions,
      rowData: rowDataAsRecord(row.rowData),
    });
    const paths = buildExportDocumentPaths(listTitle, row.id);
    setDocExport({
      markdown,
      title: paths.title,
      relativePath: paths.relativePath,
    });
  };

  return (
    <>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={handleCreateDocument}
          title="Export this row as a new Document"
        >
          <i className="bx bx-file-blank"></i> Create Document
        </button>
      </div>
      <DynamicListForm
        fields={fieldsWithOptions}
        initialData={initialRowData.rowData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Update Row"
        loading={loading}
        layout="horizontal"
      />
      <CreateDocFromRowModal
        open={docExport !== null}
        onClose={() => setDocExport(null)}
        markdown={docExport?.markdown ?? ""}
        title={docExport?.title ?? ""}
        relativePath={docExport?.relativePath ?? ""}
      />
    </>
  );
}
