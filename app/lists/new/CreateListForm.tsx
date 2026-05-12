'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ListSchemaForm from '@/components/lists/ListSchemaForm';
import { DSLSchema } from '@/lib/lists/dsl-types';

export default function CreateListForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Read from sessionStorage synchronously on mount
  const getInitialData = (): {
    schema?: DSLSchema;
    isPublic: boolean;
    fromMessageId?: string;
    fromUser?: string;
    fromUrl?: string;
  } => {
    if (typeof window === 'undefined') return { isPublic: false };
    const stored = sessionStorage.getItem('createListFromMessage');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Clear sessionStorage after reading
        sessionStorage.removeItem('createListFromMessage');

        // Determine initial visibility:
        // - If user owns the message and it's private, make list private
        // - Otherwise (public message or someone else's message), make list public
        let isPublic = true; // Default to public
        if (data.isOwner === true && data.publiclyVisible === false) {
          isPublic = false; // Private
        }

        const origin = {
          fromMessageId: typeof data.fromMessageId === 'string' ? data.fromMessageId : undefined,
          fromUser: typeof data.fromUser === 'string' ? data.fromUser : undefined,
          fromUrl: typeof data.fromUrl === 'string' ? data.fromUrl : undefined,
        };

        if (data.name || data.description || (Array.isArray(data.instagramLinks) && data.instagramLinks.length > 0)) {
          let description = typeof data.description === 'string' ? data.description : '';
          if (Array.isArray(data.instagramLinks) && data.instagramLinks.length > 0) {
            const block = ['Instagram links (extracted from message text):', ...data.instagramLinks].join('\n');
            description = description.trim()
              ? `${description.trim()}\n\n---\n${block}`
              : block;
          }
          return {
            schema: {
              name: data.name || '',
              description,
              fields: [],
            },
            isPublic,
            ...origin,
          };
        }

        return { isPublic, ...origin };
      } catch (err) {
        console.error('Failed to parse stored message data:', err);
        sessionStorage.removeItem('createListFromMessage');
      }
    }
    return { isPublic: false }; // Default to private if no data
  };

  const initialData = getInitialData();
  const [initialSchema] = useState<DSLSchema | undefined>(initialData.schema);
  const [initialIsPublic] = useState<boolean>(initialData.isPublic);
  const [fromMessageId] = useState<string | undefined>(initialData.fromMessageId);
  const [fromUser] = useState<string | undefined>(initialData.fromUser);
  const [fromUrl] = useState<string | undefined>(initialData.fromUrl);

  const handleSubmit = async (schema: DSLSchema, parentId: string | null, isPublic: boolean) => {
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
          isPublic: isPublic,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create list');
      }

      const data = await response.json();
      const listId = data.data.id;
      if (fromMessageId && fromUser) {
        const encodedFromUrl = fromUrl ? encodeURIComponent(fromUrl) : encodeURIComponent(window.location.href);
        router.push(
          `/lists/${listId}?fromMessage=${fromMessageId}&fromUser=${encodeURIComponent(fromUser)}&fromUrl=${encodedFromUrl}`
        );
      } else {
        router.push(`/lists/${listId}`);
      }
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
        initialSchema={initialSchema}
        initialIsPublic={initialIsPublic}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Create List"
        loading={loading}
      />
    </>
  );
}
