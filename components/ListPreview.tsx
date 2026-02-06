'use client';

import Link from 'next/link';
import { ParsedField } from '@/lib/lists/dsl-types';

interface ListDataRow {
  id: string;
  rowData: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

interface ListPreviewProps {
  listId: string;
  listTitle: string;
  fields: ParsedField[];
  items: ListDataRow[];
}

export default function ListPreview({ listId, listTitle, fields, items }: ListPreviewProps) {
  // Take only first 2 fields
  const displayFields = fields.slice(0, 2);
  
  // Take only first 3 items
  const displayItems = items.slice(0, 3);

  if (displayItems.length === 0) {
    return (
      <div className="card mb-3">
        <div className="card-body">
          <h6 className="mb-2">{listTitle}</h6>
          <p className="text-muted small mb-0">No items yet</p>
          <Link href={`/lists/${listId}`} className="btn btn-sm btn-outline-primary mt-2">
            View List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h6 className="mb-3">{listTitle}</h6>
        <div className="d-flex flex-column gap-2">
          {displayItems.map((item) => (
            <div key={item.id} className="card bg-light">
              <div className="card-body p-2">
                {displayFields.map((field, index) => {
                  const value = item.rowData[field.propertyKey];
                  const displayValue = value !== null && value !== undefined 
                    ? String(value) 
                    : '—';
                  
                  return (
                    <div key={field.propertyKey} className={index > 0 ? 'mt-2' : ''}>
                      <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                        {field.propertyName}:
                      </small>
                      <div className="text-break" style={{ fontSize: '0.85rem' }}>
                        {displayValue}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <Link href={`/lists/${listId}`} className="btn btn-sm btn-outline-primary mt-3 w-100">
          View Full List
        </Link>
      </div>
    </div>
  );
}
