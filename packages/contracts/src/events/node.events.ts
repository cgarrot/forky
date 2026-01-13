export interface NodeCreatedEvent {
  type: 'node.created';
  projectId: string;
  node: any;
  timestamp: Date;
}

export interface NodeUpdatedEvent {
  type: 'node.updated';
  projectId: string;
  nodeId: string;
  updates: any;
  timestamp: Date;
}

export interface NodeDeletedEvent {
  type: 'node.deleted';
  projectId: string;
  nodeId: string;
  timestamp: Date;
}

export interface NodeGeneratedEvent {
  type: 'node.generated';
  projectId: string;
  nodeId: string;
  response: string;
  duration: number;
  timestamp: Date;
}

export interface NodeStreamEvent {
  type: 'node.stream';
  projectId: string;
  nodeId: string;
  chunk: string;
  done: boolean;
  timestamp: Date;
}

export interface NodeErrorEvent {
  type: 'node.error';
  projectId: string;
  nodeId: string;
  error: string;
  timestamp: Date;
}

export type NodeEvent =
  | NodeCreatedEvent
  | NodeUpdatedEvent
  | NodeDeletedEvent
  | NodeGeneratedEvent
  | NodeStreamEvent
  | NodeErrorEvent;
