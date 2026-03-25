'use client';

import type { ReactNode } from 'react';
import { DocumentsTreeProvider } from '@/components/documents/DocumentsTreeContext';
import FolderTree from '@/components/documents/FolderTree';

export default function DocumentsWorkspace({ children }: { children: ReactNode }) {
  return (
    <DocumentsTreeProvider>
      <div className="container-fluid container-fluid-max py-4">
        <div className="row">
          <div className="col-md-4 col-lg-3 mb-4">
            <FolderTree />
          </div>
          <div className="col-md-8 col-lg-9">{children}</div>
        </div>
      </div>
    </DocumentsTreeProvider>
  );
}
