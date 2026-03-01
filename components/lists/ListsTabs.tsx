'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

type TabId = 'cards' | 'datagrid' | 'tree' | 'erd';

const VALID_VIEWS: TabId[] = ['cards', 'datagrid', 'tree', 'erd'];

function parseViewParam(value: string | null): TabId {
  if (value && VALID_VIEWS.includes(value as TabId)) {
    return value as TabId;
  }
  return 'cards';
}

interface ListsTabsProps {
  cardsView: React.ReactNode;
  datagridView: React.ReactNode;
  treeView: React.ReactNode;
  erdView: React.ReactNode;
}

export default function ListsTabs({ cardsView, datagridView, treeView, erdView }: ListsTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<TabId>(() =>
    parseViewParam(searchParams.get('view'))
  );

  useEffect(() => {
    const view = parseViewParam(searchParams.get('view'));
    setActiveTab(view);
  }, [searchParams]);

  const handleTabClick = (tab: TabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <ul className="nav nav-tabs mb-4" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'cards' ? 'active' : ''}`}
            onClick={() => handleTabClick('cards')}
            type="button"
            role="tab"
            aria-selected={activeTab === 'cards'}
          >
            <i className="bx bx-grid-alt me-1"></i>
            Cards
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'datagrid' ? 'active' : ''}`}
            onClick={() => handleTabClick('datagrid')}
            type="button"
            role="tab"
            aria-selected={activeTab === 'datagrid'}
          >
            <i className="bx bx-table me-1"></i>
            Data Grid
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'tree' ? 'active' : ''}`}
            onClick={() => handleTabClick('tree')}
            type="button"
            role="tab"
            aria-selected={activeTab === 'tree'}
          >
            <i className="bx bx-git-branch me-1"></i>
            Tree View
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'erd' ? 'active' : ''}`}
            onClick={() => handleTabClick('erd')}
            type="button"
            role="tab"
            aria-selected={activeTab === 'erd'}
          >
            <i className="bx bx-network-chart me-1"></i>
            Entity Diagram
          </button>
        </li>
      </ul>

      <div className="tab-content">
        {activeTab === 'cards' && (
          <div className="tab-pane fade show active" role="tabpanel">
            {cardsView}
          </div>
        )}
        {activeTab === 'datagrid' && (
          <div className="tab-pane fade show active" role="tabpanel">
            {datagridView}
          </div>
        )}
        {activeTab === 'tree' && (
          <div className="tab-pane fade show active" role="tabpanel">
            {treeView}
          </div>
        )}
        {activeTab === 'erd' && (
          <div className="tab-pane fade show active" role="tabpanel">
            {erdView}
          </div>
        )}
      </div>
    </>
  );
}
