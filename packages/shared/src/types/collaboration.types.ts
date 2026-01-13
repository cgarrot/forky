export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface Cursor {
  x: number;
  y: number;
  nodeId?: string;
}

export interface UserPresence {
  userId: string;
  projectId: string;
  cursor: Cursor;
  lastSeen: Date;
}

export interface UserMap {
  [userId: string]: User;
}

export interface PresenceMap {
  [userId: string]: UserPresence;
}
