export interface UserJoinedEvent {
  type: 'user.joined';
  projectId: string;
  userId: string;
  name: string;
  avatar?: string;
  timestamp: Date;
}

export interface UserLeftEvent {
  type: 'user.left';
  projectId: string;
  userId: string;
  timestamp: Date;
}

export interface CursorMovedEvent {
  type: 'cursor.moved';
  projectId: string;
  userId: string;
  x: number;
  y: number;
  nodeId?: string;
  timestamp: Date;
}

export interface UserTypingEvent {
  type: 'user.typing';
  projectId: string;
  userId: string;
  nodeId: string;
  timestamp: Date;
}

export interface SelectionChangedEvent {
  type: 'selection.changed';
  projectId: string;
  userId: string;
  selectedNodeIds: string[];
  timestamp: Date;
}

export type CollaborationEvent =
  | UserJoinedEvent
  | UserLeftEvent
  | CursorMovedEvent
  | UserTypingEvent
  | SelectionChangedEvent;
