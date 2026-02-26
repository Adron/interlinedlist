'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Node,
  Edge,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  NodeTypes,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ELK from 'elkjs/lib/elk.bundled.js';

interface ListProperty {
  propertyKey: string;
  propertyName: string;
  propertyType: string;
  displayOrder: number;
}

interface ListForERD {
  id: string;
  title: string;
  parentId: string | null;
  properties: ListProperty[];
  source?: string;
}

interface ListERDNodeData {
  label: string;
  fields: { name: string; type: string; isPrimaryKey?: boolean; isForeignKey?: boolean }[];
  listId: string;
  hasParentId?: boolean;
  hasChildren?: boolean;
  isGitHubList?: boolean;
}

interface ListsERDDiagramProps {
  lists: ListForERD[];
}

function ListTableNode({ data }: { data: ListERDNodeData }) {
  const router = useRouter();
  const isGitHub = data.isGitHubList ?? false;

  const handleClick = useCallback(() => {
    router.push(`/lists/${data.listId}`);
  }, [data.listId, router]);

  const headerBg = isGitHub ? '#24292f' : '#3b82f6';
  const borderColor = isGitHub ? '#57606a' : '#3b82f6';
  const bodyBg = isGitHub ? '#f6f8fa' : 'white';

  return (
    <div
      className="erd-table-node"
      onClick={handleClick}
      style={{
        background: bodyBg,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        minWidth: '200px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {data.hasParentId && (
        <Handle type="target" position={Position.Top} id="parentId" />
      )}
      {data.hasChildren && (
        <Handle type="source" position={Position.Bottom} id="id" />
      )}
      <div
        style={{
          background: headerBg,
          color: 'white',
          padding: '8px 12px',
          fontWeight: 'bold',
          borderTopLeftRadius: '6px',
          borderTopRightRadius: '6px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {isGitHub && <i className="bx bxl-github" style={{ fontSize: '16px' }} />}
        {data.label}
      </div>
      <div style={{ padding: '8px' }}>
        {data.fields.slice(0, 12).map((field, index) => (
          <div
            key={index}
            style={{
              fontSize: '11px',
              padding: '2px 0',
              borderBottom: index < Math.min(data.fields.length, 12) - 1 ? '1px solid #e5e7eb' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontWeight: field.isPrimaryKey ? 'bold' : 'normal',
                color: field.isPrimaryKey ? '#dc2626' : field.isForeignKey ? '#2563eb' : '#374151',
              }}
            >
              {field.isPrimaryKey && '🔑 '}
              {field.isForeignKey && '🔗 '}
              {field.name}
            </span>
            <span style={{ color: '#6b7280', marginLeft: '8px' }}>
              {field.type}
            </span>
          </div>
        ))}
        {data.fields.length > 12 && (
          <div style={{ fontSize: '10px', color: '#6b7280', paddingTop: '4px', textAlign: 'center' }}>
            +{data.fields.length - 12} more fields
          </div>
        )}
      </div>
    </div>
  );
}

const listNodeTypes: NodeTypes = {
  tableNode: ListTableNode,
};

function buildNodesAndEdges(lists: ListForERD[]): { nodes: Node<ListERDNodeData>[]; edges: Edge[] } {
  const parentIds = new Set(lists.map((l) => l.parentId).filter(Boolean) as string[]);

  const nodes: Node<ListERDNodeData>[] = lists.map((list) => {
    const fields: ListERDNodeData['fields'] = [
      { name: 'id', type: 'String', isPrimaryKey: true },
      ...(list.parentId ? [{ name: 'parentId', type: 'String', isForeignKey: true }] : []),
      ...list.properties.map((p) => ({
        name: p.propertyKey,
        type: p.propertyType,
        isPrimaryKey: false as const,
        isForeignKey: false as const,
      })),
    ];
    return {
      id: list.id,
      type: 'tableNode',
      position: { x: 0, y: 0 },
      data: {
        label: list.title,
        fields,
        listId: list.id,
        hasParentId: !!list.parentId,
        hasChildren: parentIds.has(list.id),
        isGitHubList: (list as { source?: string }).source === 'github',
      },
      width: 220,
      height: 150,
    };
  });

  const edgeSet = new Set<string>();
  const edges: Edge[] = [];
  lists.forEach((list) => {
    if (list.parentId) {
      const edgeId = `parentId-${list.parentId}-${list.id}`;
      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId);
        edges.push({
          id: edgeId,
          source: list.parentId,
          target: list.id,
          sourceHandle: 'id',
          targetHandle: 'parentId',
          type: 'smoothstep',
          label: 'parentId',
          style: {
            stroke: '#2563eb',
            strokeWidth: 2,
            strokeDasharray: '5 5',
          },
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    }
  });

  return { nodes, edges };
}

export default function ListsERDDiagram({ lists }: ListsERDDiagramProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => buildNodesAndEdges(lists), [lists]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [loading, setLoading] = useState(true);
  const elk = useMemo(() => new ELK(), []);
  const layoutKey = useMemo(() => lists.map((l) => l.id).sort().join(','), [lists]);

  useEffect(() => {
    const { nodes: n, edges: e } = buildNodesAndEdges(lists);
    setNodes(n);
    setEdges(e);
  }, [lists, setNodes, setEdges]);

  useEffect(() => {
    if (initialNodes.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const layoutNodes = async () => {
      setLoading(true);
      try {
        const graph = {
          id: 'root',
          layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.spacing.nodeNode': '100',
            'elk.layered.spacing.nodeNodeBetweenLayers': '150',
            'elk.spacing.edgeNode': '50',
            'elk.spacing.edgeEdge': '20',
            'elk.layered.nodePlacement.strategy': 'SIMPLE',
          },
          children: initialNodes.map((node) => ({
            id: node.id,
            width: node.width || 220,
            height: node.height || 150,
          })),
          edges: initialEdges.map((edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
          })),
        };

        const layoutedGraph = await elk.layout(graph);
        if (cancelled) return;

        if (layoutedGraph.children) {
          const withPositions = initialNodes.map((node) => {
            const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
            return {
              ...node,
              position: {
                x: layoutedNode?.x ?? 0,
                y: layoutedNode?.y ?? 0,
              },
              width: layoutedNode?.width ?? node.width ?? 220,
              height: layoutedNode?.height ?? node.height ?? 150,
            };
          });
          setNodes(withPositions);
        }
      } catch (error) {
        if (!cancelled) console.error('ELK layout error:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    layoutNodes();
    return () => {
      cancelled = true;
    };
  }, [layoutKey, initialNodes.length, elk, setNodes, initialNodes, initialEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, _node: Node) => {}, []);

  if (lists.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <i className="bx bx-network-chart fs-1 text-muted mb-3 d-block"></i>
          <p className="text-muted mb-0">No lists to display in the diagram.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '600px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading diagram...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '800px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={listNodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#f3f4f6" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) =>
            (node.data as ListERDNodeData).isGitHubList ? '#24292f' : '#3b82f6'
          }
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
