import type { StateCreator } from 'zustand';
import type {
  Edge,
  Node,
  NodeStatus,
  OrchestrationMetadata,
  QuickAction,
  Settings,
  UIState,
  Viewport,
} from '@forky/shared-core';

export type BuildScopeDirection = 'parents' | 'children' | 'both';

export type BuildScopeNode = {
  nodeId: string;
  depth: number;
  branches: string[];
  score: number;
  tier: 1 | 2 | 3;
  reasons: string[];
};

export type BuildSessionState = {
  rootNodeId: string;
  deliverable: string;
  direction: BuildScopeDirection;
  maxDepth: number;
  scopeNodes: Map<string, BuildScopeNode>;
  includedNodeIds: Set<string>;
  excludedNodeIds: Set<string>;
  pinnedNodeIds: Set<string>;
  suggestedIncludedNodeIds: Set<string>;
  suggestedExcludedNodeIds: Set<string>;
  frozenSuggestions: boolean;
  impactGlobalDetected: boolean;
  impactedBranchIds: Set<string>;
  targetPlanNodeId?: string;
};

export type HistorySnapshot = {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  selectedNodeIds: Set<string>;
  currentProjectName: string;
};

export type HistoryState = {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  lastKey: string | null;
  lastAt: number;
};

export interface StoreState {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  selectedNodeIds: Set<string>;
  settings: Settings;
  quickActions: QuickAction[];
  ui: UIState;
  promptFocusNodeId: string | null;
  viewport: Viewport;
  currentProjectId: string | null;
  currentProjectName: string;
  history: HistoryState;
  buildSession: BuildSessionState | null;

  startBuildSession: (rootNodeId: string) => void;
  startBuildFromNode: (rootNodeId: string) => void;
  startPlanScopeEdit: (planNodeId: string) => void;
  applyBuildScopeToPlan: () => void;
  endBuildSession: () => void;
  setNodeMode: (
    nodeId: string,
    mode: 'explore' | 'build',
    source: 'auto' | 'manual'
  ) => void;
  setBuildDeliverable: (deliverable: string) => void;
  setBuildScopeConfig: (
    config: Partial<Pick<BuildSessionState, 'direction' | 'maxDepth'>>
  ) => void;
  recomputeBuildSuggestions: (params?: { branchId?: string | null }) => void;
  toggleBuildInclude: (nodeId: string) => void;
  toggleBuildExclude: (nodeId: string) => void;
  toggleBuildPin: (nodeId: string) => void;
  includeBuildBranch: (branchId: string) => void;
  excludeBuildBranch: (branchId: string) => void;
  pinBuildBranch: (branchId: string) => void;
  unpinBuildBranch: (branchId: string) => void;
  resetBuildToSuggested: () => void;

  generatePlanFromBuildSession: () => string | null;
  generateArtifactFromPlan: (planNodeId: string) => string | null;
  generateTodoFromPlan: (planNodeId: string) => string | null;
  refreshPlanVersion: (planNodeId: string) => void;
  setActivePlanVersion: (planNodeId: string, version: number) => void;

  undo: () => void;
  redo: () => void;

  addNode: (position: { x: number; y: number }) => string;
  addNodeWithPrompt: (position: { x: number; y: number }, prompt: string) => string;
  createChildNode: (
    parentId: string,
    prompt: string,
    orchestration?: Partial<OrchestrationMetadata>
  ) => string | null;
  updateNode: (id: string, updates: Partial<Node>) => void;
  deleteNode: (id: string) => void;
  setNodes: (nodes: Map<string, Node>) => void;
  setNodeStatus: (id: string, status: NodeStatus) => void;
  updateNodePrompt: (id: string, prompt: string) => void;
  updateNodeResponse: (id: string, response: string) => void;
  updateNodeSummary: (id: string, summary: string) => void;

  addEdge: (sourceId: string, targetId: string) => string | null;
  deleteEdge: (id: string) => void;

  selectNode: (id: string) => void;
  deselectNode: (id: string) => void;
  clearSelection: () => void;
  toggleNodeSelection: (id: string) => void;
  setSelectedNodeIds: (ids: string[]) => void;

  updateSettings: (updates: Partial<Settings>) => void;

  addQuickAction: (label: string, instruction: string) => void;
  updateQuickAction: (id: string, updates: Partial<QuickAction>) => void;
  deleteQuickAction: (id: string) => void;
  reorderQuickActions: (quickActions: QuickAction[]) => void;

  toggleSidebar: () => void;
  setActiveModal: (modal: string | null) => void;
  setActiveQuickActionId: (id: string | null) => void;
  setFocusModeNodeId: (nodeId: string | null) => void;
  setPromptFocusNodeId: (nodeId: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;
  setCurrentProjectName: (name: string) => void;

  setViewport: (viewport: Viewport) => void;

  loadProject: (
    nodes: Node[],
    edges: Edge[],
    settings: Settings,
    quickActions: QuickAction[]
  ) => void;
  clearAll: () => void;
}

export type StoreSlice<T> = StateCreator<
  StoreState,
  [['zustand/immer', never], ['zustand/persist', unknown]],
  [],
  T
>;
