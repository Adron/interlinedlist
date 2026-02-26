'use client';

import { useState, useMemo, useEffect } from 'react';
import { buildListTree, listPropertiesToParsedFields } from '@/lib/lists/tree-utils';
import ListDataTable from './ListDataTable';

interface ListWithProperties {
  id: string;
  title: string;
  parentId: string | null;
  properties?: any[];
  [key: string]: any;
}

interface ListsTreePaneProps {
  lists: ListWithProperties[];
}

function TreeNodeItem({
  node,
  listMap,
  selectedListId,
  expandedIds,
  onSelect,
  onToggleExpand,
  depth,
}: {
  node: { list: { id: string; title: string }; children: any[] };
  listMap: Map<string, ListWithProperties>;
  selectedListId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  depth: number;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.list.id);
  const isSelected = selectedListId === node.list.id;

  return (
    <li className="list-unstyled">
      <div
        className={`d-flex align-items-center py-1 px-2 rounded list-group-item-action ${isSelected ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="btn btn-link btn-sm p-0 me-1 text-muted"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.list.id);
            }}
            aria-expanded={isExpanded}
          >
            <i className={`bx ${isExpanded ? 'bx-chevron-down' : 'bx-chevron-right'}`} style={{ fontSize: '1rem' }} />
          </button>
        ) : (
          <span className="me-2" style={{ width: '1rem' }} />
        )}
        <button
          type="button"
          className="btn btn-link btn-sm p-0 text-start flex-grow-1 text-decoration-none"
          onClick={() => onSelect(node.list.id)}
        >
          <span className={isSelected ? 'text-white' : ''}>{node.list.title}</span>
          {(node.list as { source?: string }).source === 'github' && (
            <i className="bx bxl-github ms-1 text-muted" style={{ fontSize: '0.8rem' }} title="GitHub-backed" />
          )}
        </button>
        <a
          href={(node.list as { source?: string }).source === 'github'
            ? `/lists/${node.list.id}?editParent=true`
            : `/lists/${node.list.id}?edit=true`}
          className={`btn btn-link btn-sm p-0 ${isSelected ? 'text-white' : 'text-muted'}`}
          title={(node.list as { source?: string }).source === 'github' ? 'Edit' : 'Edit Schema'}
          onClick={(e) => e.stopPropagation()}
        >
          <i className="bx bx-edit" style={{ fontSize: '0.9rem' }} />
        </a>
      </div>
      {hasChildren && isExpanded && (
        <ul className="list-unstyled mb-0">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.list.id}
              node={child}
              listMap={listMap}
              selectedListId={selectedListId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ListsTreePane({ lists }: ListsTreePaneProps) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildListTree(lists), [lists]);
  const listMap = useMemo(() => {
    const map = new Map<string, ListWithProperties>();
    lists.forEach((list) => map.set(list.id, list));
    return map;
  }, [lists]);

  // Select first root on mount
  useEffect(() => {
    if (selectedListId === null && tree.length > 0) {
      setSelectedListId(tree[0].list.id);
      // Expand first root if it has children
      if (tree[0].children.length > 0) {
        setExpandedIds((prev) => new Set(prev).add(tree[0].list.id));
      }
    }
  }, [tree, selectedListId]);

  const selectedList = selectedListId ? listMap.get(selectedListId) : null;
  const fields = selectedList ? listPropertiesToParsedFields(selectedList.properties || []) : [];

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (lists.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <i className="bx bx-folder-open fs-1 text-muted mb-3 d-block" />
          <p className="text-muted mb-0">No lists to display.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="row" style={{ minHeight: '400px' }}>
      <div className="col-md-4 col-lg-3">
        <div className="card h-100">
          <div className="card-header py-2">
            <h6 className="mb-0">Lists</h6>
          </div>
          <div className="card-body p-0 overflow-auto" style={{ maxHeight: '500px' }}>
            <ul className="list-unstyled mb-0 py-2">
              {tree.map((node) => (
                <TreeNodeItem
                  key={node.list.id}
                  node={node}
                  listMap={listMap}
                  selectedListId={selectedListId}
                  expandedIds={expandedIds}
                  onSelect={setSelectedListId}
                  onToggleExpand={handleToggleExpand}
                  depth={0}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="col-md-8 col-lg-9">
        {selectedList ? (
          <div className="card">
            <div className="card-header py-2 d-flex justify-content-between align-items-center">
              <h6 className="mb-0">{selectedList.title}</h6>
              <div className="d-flex gap-1">
                <a
                  href={(selectedList as { source?: string }).source === 'github'
                    ? `/lists/${selectedList.id}?editParent=true`
                    : `/lists/${selectedList.id}?edit=true`}
                  className="btn btn-sm btn-outline-secondary"
                  title={(selectedList as { source?: string }).source === 'github' ? 'Edit' : 'Edit Schema'}
                >
                  <i className="bx bx-edit me-1" />
                  Edit
                </a>
                <a href={`/lists/${selectedList.id}`} className="btn btn-sm btn-outline-primary">
                  <i className="bx bx-show me-1" />
                  View full page
                </a>
              </div>
            </div>
            <div className="card-body p-0">
              <ListDataTable listId={selectedList.id} fields={fields} />
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body text-center py-5 text-muted">
              <i className="bx bx-table fs-1 mb-3 d-block" />
              <p className="mb-0">Select a list to view its data.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
