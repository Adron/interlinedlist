'use client';

import { useState } from 'react';

export default function ListsTreeView() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="lists-treeview">
          <div 
            className="treeview-root d-flex align-items-center mb-2"
            style={{ cursor: 'pointer' }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <i className={`bx ${isExpanded ? 'bx-chevron-down' : 'bx-chevron-right'} me-2`}></i>
            <strong>Lists</strong>
          </div>
          
          {isExpanded && (
            <ul className="list-unstyled ms-3 mb-0">
              <li className="mb-1">
                <i className="bx bx-folder me-2 text-muted"></i>
                <span>list of cool things</span>
              </li>
              <li className="mb-1">
                <i className="bx bx-folder me-2 text-muted"></i>
                <span>another set to sort</span>
              </li>
              <li className="mb-1">
                <i className="bx bx-folder me-2 text-muted"></i>
                <span>to-do items</span>
              </li>
              <li className="mb-1">
                <div 
                  className="d-flex align-items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
                >
                  <i className={`bx ${isMetadataExpanded ? 'bx-chevron-down' : 'bx-chevron-right'} me-2`}></i>
                  <i className="bx bx-folder me-2 text-muted"></i>
                  <span>metadata added listing</span>
                </div>
                {isMetadataExpanded && (
                  <ul className="list-unstyled ms-4 mt-1 mb-0">
                    <li className="mb-1">
                      <i className="bx bx-link me-2 text-muted"></i>
                      <span>Instagram link</span>
                    </li>
                    <li className="mb-1">
                      <i className="bx bx-link me-2 text-muted"></i>
                      <span>Blue Sky links</span>
                    </li>
                    <li className="mb-1">
                      <i className="bx bx-link me-2 text-muted"></i>
                      <span>Threads links</span>
                    </li>
                    <li className="mb-1">
                      <i className="bx bx-link me-2 text-muted"></i>
                      <span>Thoughts links</span>
                    </li>
                    <li className="mb-1">
                      <i className="bx bx-link me-2 text-muted"></i>
                      <span>Linked In Stuff</span>
                    </li>
                  </ul>
                )}
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
