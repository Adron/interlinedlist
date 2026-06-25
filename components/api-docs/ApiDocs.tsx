'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// Swagger UI touches `window`/`document` during render, so it must never be
// server-rendered. Load it client-side only.
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <p className="text-muted">Loading API explorer…</p>,
});

/**
 * Interactive Swagger UI explorer for the InterlinedList HTTP API.
 * Reads the generated spec served at /api/openapi.json.
 */
export default function ApiDocs() {
  return (
    <div className="api-docs-swagger">
      <SwaggerUI
        url="/api/openapi.json"
        docExpansion="list"
        deepLinking
        tryItOutEnabled
      />
    </div>
  );
}
