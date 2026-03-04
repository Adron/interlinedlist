'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import DynamicListForm from '@/components/lists/DynamicListForm';
import { ParsedField } from '@/lib/lists/dsl-types';

interface AddRowFormProps {
  listId: string;
  fields: ParsedField[];
  listSource?: 'local' | 'github';
  githubRepo?: string;
}

export default function AddRowForm({ listId, fields, listSource, githubRepo }: AddRowFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldsWithOptions, setFieldsWithOptions] = useState<ParsedField[]>(fields);
  const [initialData, setInitialData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (listSource !== 'github' || !githubRepo) {
      setFieldsWithOptions(fields);
      setInitialData({});
      return;
    }
    const [owner, repo] = githubRepo.split('/');
    if (!owner || !repo) {
      setFieldsWithOptions(fields);
      setInitialData({});
      return;
    }
    Promise.all([
      fetch(`/api/github/repos/${owner}/${repo}/labels`).then((r) => r.json()),
      fetch(`/api/github/repos/${owner}/${repo}/assignees`).then((r) => r.json()),
    ]).then(([labelsData, assigneesData]) => {
      const labels = Array.isArray(labelsData) ? labelsData.map((l: { name?: string }) => l.name).filter(Boolean) : [];
      const assignees = Array.isArray(assigneesData) ? assigneesData.map((a: { login?: string }) => a.login).filter(Boolean) : [];
      const filteredFields = fields.filter(
        (f) => !['number', 'url', 'created_at', 'updated_at'].includes(f.propertyKey)
      );
      setFieldsWithOptions(
        filteredFields.map((f) => {
          if (f.propertyKey === 'labels' && labels.length > 0) {
            return { ...f, validationRules: { ...f.validationRules, options: labels } };
          }
          if (f.propertyKey === 'assignees' && assignees.length > 0) {
            return { ...f, validationRules: { ...f.validationRules, options: assignees } };
          }
          return f;
        })
      );
      setInitialData({});
    }).catch(() => {
      const fallback =
        listSource === 'github'
          ? fields.filter((f) => !['number', 'url', 'created_at', 'updated_at'].includes(f.propertyKey))
          : fields;
      setFieldsWithOptions(fallback);
      setInitialData({});
    });
  }, [listSource, githubRepo, fields]);


  const handleSubmit = async (data: Record<string, any>) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/lists/${listId}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const message = errorData.error || 'Failed to add row';
        const details = Array.isArray(errorData.details) ? errorData.details : [];
        throw { message, details };
      }

      router.push(`/lists/${listId}`);
      router.refresh();
    } catch (err: any) {
      const message = err?.message || 'Failed to add row';
      const details = err?.details;
      setError(
        Array.isArray(details) && details.length > 0
          ? `${message}: ${details.map((d: { field: string; message: string }) => d.message).join('; ')}`
          : message
      );
      setLoading(false);
      if (Array.isArray(details) && details.length > 0) {
        throw err;
      }
    }
  };

  const handleCancel = () => {
    router.push(`/lists/${listId}`);
  };

  return (
    <>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <DynamicListForm
        fields={fieldsWithOptions}
        initialData={Object.keys(initialData).length > 0 ? initialData : undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Add Row"
        loading={loading}
        layout="horizontal"
      />
    </>
  );
}
