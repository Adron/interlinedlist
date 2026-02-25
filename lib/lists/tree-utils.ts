/**
 * Client-safe list tree utilities.
 * No Prisma or server-only dependencies - safe to import from client components.
 */

import { ParsedField } from './dsl-types';

export interface TreeNode {
  list: {
    id: string;
    title: string;
    parentId: string | null;
    [key: string]: any;
  };
  children: TreeNode[];
}

/**
 * Builds a hierarchical tree structure from a flat list of lists
 */
export function buildListTree(
  lists: Array<{ id: string; title: string; parentId: string | null; [key: string]: any }>
): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  lists.forEach((list) => {
    map.set(list.id, { list, children: [] });
  });

  lists.forEach((list) => {
    const node = map.get(list.id)!;
    if (list.parentId && map.has(list.parentId)) {
      map.get(list.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function convertToParsedField(property: any): ParsedField {
  return {
    propertyKey: property.propertyKey,
    propertyName: property.propertyName,
    propertyType: property.propertyType,
    displayOrder: property.displayOrder,
    isRequired: property.isRequired,
    defaultValue: property.defaultValue,
    validationRules:
      property.validationRules && typeof property.validationRules === 'object'
        ? (property.validationRules as Record<string, any>)
        : null,
    helpText: property.helpText,
    placeholder: property.placeholder,
    isVisible: property.isVisible,
    visibilityCondition:
      property.visibilityCondition && typeof property.visibilityCondition === 'object'
        ? (property.visibilityCondition as Record<string, any>)
        : null,
  };
}

/**
 * Converts an array of list properties to ParsedField format.
 * Use when a list already has properties loaded (e.g. from getUserListsWithProperties).
 */
export function listPropertiesToParsedFields(properties: any[]): ParsedField[] {
  return (properties || []).map(convertToParsedField);
}
