'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ListSchemaForm from '@/components/lists/ListSchemaForm';
import { DSLSchema } from '@/lib/lists/dsl-types';
import { parsedSchemaToDSL } from '@/lib/lists/dsl-parser';

interface EditSchemaFormProps {
  listId: string;
  initialSchema: any;
}

export default function EditSchemaForm({ listId, initialSchema }: EditSchemaFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (schema: DSLSchema, parentId: string | null) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/lists/${listId}/schema`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schema, parentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update schema');
      }

      router.push(`/lists/${listId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update schema');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/lists/${listId}`);
  };

  // Convert list properties to DSL format
  const initialDSL = initialSchema.properties
    ? parsedSchemaToDSL({
        title: initialSchema.title,
        description: initialSchema.description,
        fields: initialSchema.properties.map((prop: any) => ({
          propertyKey: prop.propertyKey,
          propertyName: prop.propertyName,
          propertyType: prop.propertyType,
          displayOrder: prop.displayOrder,
          isRequired: prop.isRequired,
          defaultValue: prop.defaultValue,
          validationRules: prop.validationRules as any,
          helpText: prop.helpText,
          placeholder: prop.placeholder,
          isVisible: prop.isVisible,
          visibilityCondition: prop.visibilityCondition as any,
        })),
      })
    : undefined;

  return (
    <>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <ListSchemaForm
        initialSchema={initialDSL}
        initialParentId={initialSchema.parentId || null}
        currentListId={listId}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Update Schema"
        loading={loading}
      />
    </>
  );
}
