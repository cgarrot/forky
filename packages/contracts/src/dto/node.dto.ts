import type { Position } from '@forky/shared';

export interface CreateNodeDto {
  prompt: string;
  position?: Position;
  parentIds?: string[];
  metadata?: any;
}

export interface UpdateNodeDto {
  id: string;
  prompt?: string;
  response?: string;
  summary?: string;
  position?: Position;
  parentIds?: string[];
  metadata?: any;
}

export interface DeleteNodeDto {
  nodeId: string;
}

export interface NodeResponseDto {
  id: string;
  prompt: string;
  response?: string;
  summary?: string;
  status: string;
  position: Position;
  parentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateNodeDto {
  nodeId: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface StreamNodeChunkDto {
  nodeId: string;
  chunk: string;
  done: boolean;
}
