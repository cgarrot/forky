export type ProjectViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type ProjectOwner = {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar: string | null;
};

export type QuickAction = {
  id: string;
  label: string;
  instruction: string;
  order: number;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  ownerId: string;
  owner: ProjectOwner;
  isPublic: boolean;
  shareToken: string | null;
  nodeCount: number;
  memberCount: number;
  viewport: ProjectViewport;
  quickActions?: QuickAction[] | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};
