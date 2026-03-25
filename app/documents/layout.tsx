import type { ReactNode } from 'react';
import DocumentsWorkspace from '@/components/documents/DocumentsWorkspace';

export default function DocumentsLayout({ children }: { children: ReactNode }) {
  return <DocumentsWorkspace>{children}</DocumentsWorkspace>;
}
