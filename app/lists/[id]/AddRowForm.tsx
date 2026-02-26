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
      const response = await fetch(`/api/lists/${listId}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add row');
      }

      router.push(`/lists/${listId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add row');
      setLoading(false);
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
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Add Row"
        loading={loading}
        layout="horizontal"
      />
    </>
  );
}
