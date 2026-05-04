'use client';

import { useState } from 'react';
import { LIST_TEMPLATES, getTemplateList } from '@/lib/lists/templates';
import ListSchemaForm from '@/components/lists/ListSchemaForm';

export default function TemplateListForm({
  onCancel,
}: {
  onCancel?: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');

  if (selectedTemplate) {
    const template = LIST_TEMPLATES[selectedTemplate];
    return (
      <>
        <div className="mb-3">
          <button
            type="button"
            className="btn btn-sm btn-link p-0 text-muted"
            onClick={() => setSelectedTemplate(null)}
          >
            ← Back to templates
          </button>
        </div>
        <ListSchemaForm
          initialSchema={{
            name: listName || template.name,
            description: description || template.description,
            fields: template.fields,
          }}
          onSubmit={async (schema, parentId, isPublic) => {
            const res = await fetch('/api/lists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: schema.name,
                description: schema.description,
                schema: schema.fields,
                parentId: parentId || null,
                isPublic,
              }),
            });
            if (!res.ok) throw new Error('Failed to create list');
            window.location.href = '/lists';
          }}
          onCancel={() => setSelectedTemplate(null)}
          submitLabel="Create List from Template"
        />
      </>
    );
  }

  const templates = getTemplateList();

  return (
    <div>
      <h5 className="mb-3">Choose a Template</h5>
      <div className="row">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="col-md-6 col-lg-4 mb-3">
            <div
              className="card h-100"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setSelectedTemplate(tmpl.id);
                setListName('');
                setDescription('');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedTemplate(tmpl.id);
                  setListName('');
                  setDescription('');
                }
              }}
            >
              <div className="card-body">
                <h6 className="card-title">{tmpl.name}</h6>
                <p className="card-text small text-muted mb-2">
                  {tmpl.description}
                </p>
                <span className="badge bg-secondary small">
                  {tmpl.fieldCount} fields
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {onCancel && (
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
