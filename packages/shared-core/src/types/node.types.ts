export type NodeStatus = 'idle' | 'loading' | 'error' | 'stale';

export interface Position {
  x: number;
  y: number;
}

export interface NodeMetadata {
  tags?: string[];
  color?: string;
  customData?: Record<string, any>;
}

export interface Node {
  id: string;
  prompt: string;
  response?: string;
  summary?: string;
  status: NodeStatus;
  position: Position;
  parentIds: string[];
  childrenIds: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: NodeMetadata;
}

export interface NodeMap {
  [nodeId: string]: Node;
}

export interface NodeUpdate {
  id: string;
  prompt?: string;
  response?: string;
  summary?: string;
  status?: NodeStatus;
  position?: Position;
  parentIds?: string[];
  childrenIds?: string[];
  metadata?: NodeMetadata;
}
