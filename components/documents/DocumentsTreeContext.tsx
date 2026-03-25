'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type DocumentsTreeContextValue = {
  refreshVersion: number;
  requestTreeRefresh: () => void;
};

const DocumentsTreeContext = createContext<DocumentsTreeContextValue | null>(
  null
);

export function DocumentsTreeProvider({ children }: { children: ReactNode }) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestTreeRefresh = useCallback(() => {
    setRefreshVersion((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({ refreshVersion, requestTreeRefresh }),
    [refreshVersion, requestTreeRefresh]
  );

  return (
    <DocumentsTreeContext.Provider value={value}>
      {children}
    </DocumentsTreeContext.Provider>
  );
}

export function useDocumentsTreeRefresh(): DocumentsTreeContextValue {
  const ctx = useContext(DocumentsTreeContext);
  if (!ctx) {
    return { refreshVersion: 0, requestTreeRefresh: () => {} };
  }
  return ctx;
}
