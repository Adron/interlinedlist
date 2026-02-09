'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ELK from 'elkjs/lib/elk.bundled.js';
import { Field } from '@/lib/architecture-aggregates/schema-parser';

interface ERDNodeData {
  label: string;
  fields: Field[];
  rowCount?: number;
}

interface ERDDiagramProps {
  nodes: Node<ERDNodeData>[];
  edges: Edge[];
}

// Custom table node component
function TableNode({ data }: { data: ERDNodeData }) {
  const router = useRouter();

  const handleClick = useCallback(() => {
    // Map model name to table name
    const tableNameMap: Record<string, string> = {
      'User': 'users',
      'Message': 'messages',
      'List': 'lists',
      'ListProperty': 'list_properties',
      'ListDataRow': 'list_data_rows',
      'Administrator': 'administrators',
      'Organization': 'organizations',
      'UserOrganization': 'user_organizations',
      'Follow': 'follows',
    };
    
    const tableName = tableNameMap[data.label] || data.label.toLowerCase();
    router.push(`/architecture-aggregates/${tableName}`);
  }, [data.label, router]);

  const formatFieldType = (field: Field): string => {
    let type = field.type;
    if (field.isArray) {
      type = `${type}[]`;
    }
    if (field.isOptional) {
      type = `${type}?`;
    }
    return type;
  };

  return (
    <div
      className="erd-table-node"
      onClick={handleClick}
      style={{
        background: 'white',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        minWidth: '200px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          background: '#3b82f6',
          color: 'white',
          padding: '8px 12px',
          fontWeight: 'bold',
          borderTopLeftRadius: '6px',
          borderTopRightRadius: '6px',
          fontSize: '14px',
        }}
      >
        {data.label}
        {data.rowCount !== undefined && (
          <span style={{ float: 'right', fontSize: '12px', opacity: 0.9 }}>
            {data.rowCount.toLocaleString()}
          </span>
        )}
      </div>
      <div style={{ padding: '8px' }}>
        {data.fields.slice(0, 10).map((field, index) => (
          <div
            key={index}
            style={{
              fontSize: '11px',
              padding: '2px 0',
              borderBottom: index < Math.min(data.fields.length, 10) - 1 ? '1px solid #e5e7eb' : 'none',
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
              {formatFieldType(field)}
            </span>
          </div>
        ))}
        {data.fields.length > 10 && (
          <div style={{ fontSize: '10px', color: '#6b7280', paddingTop: '4px', textAlign: 'center' }}>
            +{data.fields.length - 10} more fields
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
};

export default function ERDDiagram({ nodes: initialNodes, edges: initialEdges }: ERDDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [loading, setLoading] = useState(true);

  const elk = useMemo(() => new ELK(), []);

  useEffect(() => {
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
          children: nodes.map((node) => ({
            id: node.id,
            width: node.width || 220,
            height: node.height || 150,
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
          })),
        };

        const layoutedGraph = await elk.layout(graph);

        if (layoutedGraph.children) {
          setNodes((nds) =>
            nds.map((node) => {
              const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
              return {
                ...node,
                position: {
                  x: layoutedNode?.x || 0,
                  y: layoutedNode?.y || 0,
                },
                width: layoutedNode?.width || node.width || 220,
                height: layoutedNode?.height || node.height || 150,
              };
            })
          );
        }
      } catch (error) {
        console.error('ELK layout error:', error);
        // Fallback: use original positions
      } finally {
        setLoading(false);
      }
    };

    if (nodes.length > 0) {
      layoutNodes();
    }
  }, [nodes.length, elk, setNodes]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Navigation is handled in TableNode component
  }, []);

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
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#f3f4f6" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            return '#3b82f6';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
