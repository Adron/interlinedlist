import fs from 'fs';
import path from 'path';
import { Edge } from 'reactflow';

export interface Field {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isForeignKey: boolean;
  relationName?: string;
  relationField?: string;
  onDelete?: string;
}

export interface Model {
  name: string;
  tableName: string;
  fields: Field[];
  relations: Relation[];
}

export interface Relation {
  fromModel: string;
  toModel: string;
  fromField: string;
  toField: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  relationName?: string;
  onDelete?: string;
}

export interface ERDNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    fields: Field[];
    rowCount?: number;
  };
  width?: number;
  height?: number;
}

export type ERDEdge = Edge;

/**
 * Parse Prisma schema file and extract model information
 */
export function parsePrismaSchema(): Model[] {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  const models: Model[] = [];
  const modelBlocks = schemaContent.match(/model\s+\w+\s*\{[\s\S]*?\n\}/g) || [];

  for (const block of modelBlocks) {
    const modelMatch = block.match(/model\s+(\w+)/);
    if (!modelMatch) continue;

    const modelName = modelMatch[1];
    const tableMatch = block.match(/@@map\("([^"]+)"\)/);
    const tableName = tableMatch ? tableMatch[1] : modelName.toLowerCase();

    const fields: Field[] = [];
    const fieldLines = block.match(/^\s+\w+.*$/gm) || [];

    for (const line of fieldLines) {
      // Skip relation definitions (they're handled separately)
      if (line.includes('@relation') && !line.includes('fields:')) {
        continue;
      }

      const fieldMatch = line.match(/^\s+(\w+)\s+([^\s]+)(\?|\[\])?/);
      if (!fieldMatch) continue;

      const [, fieldName, fieldType, optionalOrArray] = fieldMatch;
      const isOptional = optionalOrArray === '?';
      const isArray = optionalOrArray === '[]';

      // Check for primary key
      const isPrimaryKey = line.includes('@id');
      const isUnique = line.includes('@unique') || isPrimaryKey;

      // Check for foreign key and relation
      let isForeignKey = false;
      let relationName: string | undefined;
      let relationField: string | undefined;
      let onDelete: string | undefined;

      const relationMatch = line.match(/@relation\([^)]*\)/);
      if (relationMatch) {
        const relationContent = relationMatch[0];
        isForeignKey = relationContent.includes('fields:');
        
        const fieldsMatch = relationContent.match(/fields:\s*\[([^\]]+)\]/);
        const referencesMatch = relationContent.match(/references:\s*\[([^\]]+)\]/);
        const nameMatch = relationContent.match(/name:\s*"([^"]+)"/);
        
        if (fieldsMatch && referencesMatch) {
          relationField = referencesMatch[1].trim();
        }
        if (nameMatch) {
          relationName = nameMatch[1];
        }
        
        if (relationContent.includes('onDelete:')) {
          const onDeleteMatch = relationContent.match(/onDelete:\s*(\w+)/);
          if (onDeleteMatch) {
            onDelete = onDeleteMatch[1];
          }
        }
      }

      // Check if it's a foreign key field (references another model)
      if (!isForeignKey && fieldType.match(/^[A-Z]/) && !['String', 'Int', 'Boolean', 'DateTime', 'Float', 'Json'].includes(fieldType)) {
        isForeignKey = true;
        relationField = 'id';
      }

      fields.push({
        name: fieldName,
        type: fieldType,
        isOptional,
        isArray,
        isPrimaryKey,
        isUnique,
        isForeignKey,
        relationName,
        relationField,
        onDelete,
      });
    }

    models.push({
      name: modelName,
      tableName,
      fields,
      relations: [],
    });
  }

  // Extract relations
  for (const model of models) {
    const modelBlock = modelBlocks.find(b => b.includes(`model ${model.name}`));
    if (!modelBlock) continue;

    const relationLines = modelBlock.match(/^\s+\w+.*@relation.*$/gm) || [];
    
    for (const line of relationLines) {
      const fieldMatch = line.match(/^\s+(\w+)\s+([A-Z]\w+)(\?|\[\])?/);
      if (!fieldMatch) continue;

      const [, fieldName, relatedModelName, optionalOrArray] = fieldMatch;
      const isArray = optionalOrArray === '[]';
      const isOptional = optionalOrArray === '?';

      const relationMatch = line.match(/@relation\([^)]*\)/);
      if (!relationMatch) continue;

      const relationContent = relationMatch[0];
      const nameMatch = relationContent.match(/name:\s*"([^"]+)"/);
      const fieldsMatch = relationContent.match(/fields:\s*\[([^\]]+)\]/);
      const referencesMatch = relationContent.match(/references:\s*\[([^\]]+)\]/);
      
      let onDelete: string | undefined;
      if (relationContent.includes('onDelete:')) {
        const onDeleteMatch = relationContent.match(/onDelete:\s*(\w+)/);
        if (onDeleteMatch) {
          onDelete = onDeleteMatch[1];
        }
      }

      const relatedModel = models.find(m => m.name === relatedModelName);
      if (!relatedModel) continue;

      // Determine relation type
      let relationType: 'one-to-one' | 'one-to-many' | 'many-to-many';
      if (isArray) {
        relationType = 'many-to-many';
      } else if (isOptional) {
        relationType = 'one-to-one';
      } else {
        relationType = 'one-to-many';
      }

      // Check if reverse relation exists (many-to-many through junction table)
      const reverseRelation = relatedModel.fields.find(
        f => f.type === model.name && f.relationName === nameMatch?.[1]
      );

      if (reverseRelation && reverseRelation.isArray) {
        relationType = 'many-to-many';
      }

      model.relations.push({
        fromModel: model.name,
        toModel: relatedModelName,
        fromField: fieldsMatch ? fieldsMatch[1].trim() : fieldName,
        toField: referencesMatch ? referencesMatch[1].trim() : 'id',
        type: relationType,
        relationName: nameMatch?.[1],
        onDelete,
      });
    }
  }

  return models;
}

/**
 * Convert parsed models to React Flow nodes and edges
 */
export function buildERDData(models: Model[], rowCounts?: Record<string, number>): {
  nodes: ERDNode[];
  edges: Edge[];
} {
  const nodes: ERDNode[] = [];
  const edges: ERDEdge[] = [];
  const edgeSet = new Set<string>();

  // Create nodes
  for (const model of models) {
    const tableName = model.tableName;
    const rowCount = rowCounts?.[tableName] || 0;

    nodes.push({
      id: tableName,
      type: 'tableNode',
      position: { x: 0, y: 0 }, // Will be calculated by ELK
      data: {
        label: model.name,
        fields: model.fields,
        rowCount,
      },
    });
  }

  // Create edges
  for (const model of models) {
    for (const relation of model.relations) {
      const fromTable = model.tableName;
      const toModel = models.find(m => m.name === relation.toModel);
      if (!toModel) continue;

      const toTable = toModel.tableName;
      const edgeId = `${fromTable}-${toTable}-${relation.fromField}`;
      const reverseEdgeId = `${toTable}-${fromTable}-${relation.toField}`;

      // Avoid duplicate edges
      if (edgeSet.has(edgeId) || edgeSet.has(reverseEdgeId)) {
        continue;
      }

      edgeSet.add(edgeId);

      let edgeLabel = relation.fromField;
      if (relation.onDelete) {
        edgeLabel += ` (${relation.onDelete})`;
      }

      const edge: Edge = {
        id: edgeId,
        source: fromTable,
        target: toTable,
        type: 'smoothstep',
        label: edgeLabel,
        style: {
          stroke: relation.type === 'many-to-many' ? '#9333ea' : '#3b82f6',
          strokeWidth: 2,
        },
        markerEnd: {
          type: 'arrowclosed' as any,
        },
      };
      edges.push(edge);
    }
  }

  return { nodes, edges };
}

/**
 * Get ERD data for the current schema
 */
export function getERDData(rowCounts?: Record<string, number>): {
  nodes: ERDNode[];
  edges: Edge[];
} {
  const models = parsePrismaSchema();
  return buildERDData(models, rowCounts);
}
