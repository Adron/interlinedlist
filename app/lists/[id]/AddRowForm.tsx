'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import DynamicListForm from '@/components/lists/DynamicListForm';
import { ParsedField } from '@/lib/lists/dsl-types';

interface AddRowFormProps {
  listId: string;
  fields: ParsedField[];
}

export default function AddRowForm({ listId, fields }: AddRowFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        fields={fields}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Add Row"
        loading={loading}
      />
    </>
  );
}
