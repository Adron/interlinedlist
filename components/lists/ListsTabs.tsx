'use client';

import { useState } from 'react';

interface ListsTabsProps {
  cardsView: React.ReactNode;
  datagridView: React.ReactNode;
  treeView: React.ReactNode;
  erdView: React.ReactNode;
}

export default function ListsTabs({ cardsView, datagridView, treeView, erdView }: ListsTabsProps) {
  const [activeTab, setActiveTab] = useState<'cards' | 'datagrid' | 'tree' | 'erd'>('cards');

  return (
    <>
      <ul className="nav nav-tabs mb-4" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'cards' ? 'active' : ''}`}
            onClick={() => setActiveTab('cards')}
            type="button"
            role="tab"
          >
            <i className="bx bx-grid-alt me-1"></i>
            Cards
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'datagrid' ? 'active' : ''}`}
            onClick={() => setActiveTab('datagrid')}
            type="button"
            role="tab"
          >
            <i className="bx bx-table me-1"></i>
            Data Grid
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'tree' ? 'active' : ''}`}
            onClick={() => setActiveTab('tree')}
            type="button"
            role="tab"
          >
            <i className="bx bx-git-branch me-1"></i>
            Tree View
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'erd' ? 'active' : ''}`}
            onClick={() => setActiveTab('erd')}
            type="button"
            role="tab"
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
