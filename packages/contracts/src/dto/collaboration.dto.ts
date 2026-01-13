import type { Cursor } from '@forky/shared';

export interface JoinProjectDto {
  projectId: string;
  userId?: string;
}

export interface LeaveProjectDto {
  projectId: string;
  userId?: string;
}

export interface CursorMoveDto {
  projectId: string;
  userId: string;
  cursor: Cursor;
  timestamp: Date;
}

export interface UserPresenceDto {
  userId: string;
  name: string;
  avatar?: string;
  cursor: Cursor;
  lastSeen: Date;
}

export interface ProjectUsersDto {
  projectId: string;
  users: UserPresenceDto[];
}
