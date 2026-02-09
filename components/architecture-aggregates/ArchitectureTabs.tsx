'use client';

import { useState } from 'react';

interface ArchitectureTabsProps {
  tableView: React.ReactNode;
  erdView: React.ReactNode;
}

export default function ArchitectureTabs({ tableView, erdView }: ArchitectureTabsProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'erd'>('table');

  return (
    <>
      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-4" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
            type="button"
            role="tab"
          >
            <i className="bx bx-table me-1"></i>
            Table View
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
            ERD Diagram
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'table' && (
          <div className="tab-pane fade show active" role="tabpanel">
            {tableView}
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
