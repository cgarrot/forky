import type { QuickAction, Viewport } from '@forky/shared';

export interface CreateProjectDto {
  name: string;
  description?: string;
  systemPrompt?: string;
}

export interface UpdateProjectDto {
  id: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  quickActions?: QuickAction[];
  viewport?: Viewport;
}

export interface ProjectResponseDto {
  id: string;
  name: string;
  description?: string;
  nodeCount: number;
  edgeCount: number;
  systemPrompt?: string;
  quickActions?: QuickAction[];
  viewport: Viewport;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeleteProjectDto {
  projectId: string;
}

export interface ProjectListDto {
  projects: ProjectResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
