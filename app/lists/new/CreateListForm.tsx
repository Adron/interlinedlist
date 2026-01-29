'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ListSchemaForm from '@/components/lists/ListSchemaForm';
import { DSLSchema } from '@/lib/lists/dsl-types';

export default function CreateListForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (schema: DSLSchema, parentId: string | null) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: schema.name,
          description: schema.description,
          schema: schema,
          parentId: parentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create list');
      }

      const data = await response.json();
      router.push(`/lists/${data.data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create list');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/lists');
  };

  return (
    <>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <ListSchemaForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Create List"
        loading={loading}
      />
    </>
  );
}
