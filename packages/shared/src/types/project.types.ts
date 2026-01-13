export interface QuickAction {
  id: string;
  label: string;
  instruction: string;
  order: number;
}

export interface Settings {
  systemPrompt: string;
  defaultModel: string;
}

export interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  activeQuickActionId: string | null;
  focusModeNodeId: string | null;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  nodes: Record<string, any>;
  edges: Record<string, any>;
  systemPrompt?: string;
  quickActions?: QuickAction[];
  viewport: Viewport;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  systemPrompt?: string;
}

export interface ProjectUpdate {
  id: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  quickActions?: QuickAction[];
  viewport?: Viewport;
}
