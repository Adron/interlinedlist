// List type definitions
// Will be expanded in Phase 4

export interface List {
  id: string;
  userId: string;
  postId?: string;
  title: string;
  listType: 'todo' | 'shopping' | 'custom' | 'nested';
  metadata?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListItem {
  id: string;
  listId: string;
  parentId?: string;
  content: string;
  orderIndex: number;
  checked: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
