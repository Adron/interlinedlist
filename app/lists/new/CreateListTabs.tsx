'use client';

import { useState } from 'react';
import CreateListForm from './CreateListForm';
import CreateGitHubListForm from '@/components/lists/CreateGitHubListForm';

type Tab = 'local' | 'github';

export default function CreateListTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('local');

  return (
    <>
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => setActiveTab('local')}
          >
            Local List
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'github' ? 'active' : ''}`}
            onClick={() => setActiveTab('github')}
          >
            GitHub-backed List
          </button>
        </li>
      </ul>
      {activeTab === 'local' && <CreateListForm />}
      {activeTab === 'github' && <CreateGitHubListForm />}
    </>
  );
}
