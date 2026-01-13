export interface ProjectCreatedEvent {
  type: 'project.created';
  projectId: string;
  name: string;
  userId?: string;
  timestamp: Date;
}

export interface ProjectUpdatedEvent {
  type: 'project.updated';
  projectId: string;
  updates: any;
  timestamp: Date;
}

export interface ProjectDeletedEvent {
  type: 'project.deleted';
  projectId: string;
  userId?: string;
  timestamp: Date;
}

export interface ProjectExportedEvent {
  type: 'project.exported';
  projectId: string;
  format: string;
  url?: string;
  timestamp: Date;
}

export type ProjectEvent =
  | ProjectCreatedEvent
  | ProjectUpdatedEvent
  | ProjectDeletedEvent
  | ProjectExportedEvent;
