import type { Project, Node, User, Media, NodeMap, EdgeMap } from '@forky/shared';

export interface IProjectRepository {
  findAll(options?: FindOptions): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  findByUserId(userId: string): Promise<Project[]>;
  create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  update(id: string, updates: Partial<Project>): Promise<Project>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}

export interface INodeRepository {
  findAll(projectId: string): Promise<Node[]>;
  findById(id: string): Promise<Node | null>;
  findByProjectId(projectId: string): Promise<NodeMap>;
  findByParentIds(parentIds: string[]): Promise<Node[]>;
  create(node: Omit<Node, 'id' | 'createdAt' | 'updatedAt'>): Promise<Node>;
  update(id: string, updates: Partial<Node>): Promise<Node>;
  delete(id: string): Promise<void>;
  deleteByProjectId(projectId: string): Promise<void>;
}

export interface IEdgeRepository {
  findAll(projectId: string): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findByProjectId(projectId: string): Promise<EdgeMap>;
  findBySource(sourceId: string): Promise<any[]>;
  findByTarget(targetId: string): Promise<any[]>;
  create(edge: Omit<any, 'id' | 'createdAt'>): Promise<any>;
  delete(id: string): Promise<void>;
  deleteByProjectId(projectId: string): Promise<void>;
  deleteByNodeId(nodeId: string): Promise<void>;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: Omit<User, 'id'>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface IMediaRepository {
  findById(id: string): Promise<Media | null>;
  findByProjectId(projectId: string): Promise<Media[]>;
  create(media: Omit<Media, 'id' | 'createdAt'>): Promise<Media>;
  update(id: string, updates: Partial<Media>): Promise<Media>;
  delete(id: string): Promise<void>;
  deleteByProjectId(projectId: string): Promise<void>;
}

export interface FindOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}
