import type { Metadata } from 'next';
import ApiDocs from '@/components/api-docs/ApiDocs';

export const metadata: Metadata = {
  title: 'API Reference — InterlinedList',
  description:
    'Interactive OpenAPI / Swagger reference for the InterlinedList HTTP API.',
};

export default function ApiDocsPage() {
  return (
    <div className="container py-4">
      <div className="mb-3">
        <h1 className="h3 mb-1">API Reference</h1>
        <p className="text-muted mb-0">
          Interactive reference for the InterlinedList HTTP API. Use the{' '}
          <strong>Authorize</strong> button to add a sync token (from{' '}
          <code>POST /api/auth/sync-token</code>) and try requests live. The raw
          OpenAPI spec is available at{' '}
          <a href="/api/openapi.json">/api/openapi.json</a>, and the full prose
          reference lives in the <a href="/help/api">Help &amp; API docs</a>.
        </p>
      </div>
      <ApiDocs />
    </div>
  );
}
