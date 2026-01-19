import { useMemo } from 'react';
import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  computeHeuristicScore,
  computeScope,
  generateEdgeId,
  generateId,
  generateNodeId,
  isPinned,
  readOrchestrationMetadata,
  writeOrchestrationMetadata,
} from '@forky/shared';
import type {
  Edge,
  Node,
  NodeStatus,
  OrchestrationMetadata,
  QuickAction,
  Settings,
  UIState,
  Viewport,
} from '@forky/shared';

enableMapSet();

const defaultQuickActions: QuickAction[] = [
  {
    id: 'qa-1',
    label: 'Concise',
    instruction: 'Rephrase more concisely while keeping the essentials.',
    order: 0,
  },
  {
    id: 'qa-2',
    label: 'Details',
    instruction: "Develop with more details and examples.",
    order: 1,
  },
  {
    id: 'qa-3',
    label: 'ELI5',
    instruction: "Explain like I'm 5 years old.",
    order: 2,
  },
];

type BuildScopeDirection = 'parents' | 'children' | 'both';

type BuildScopeNode = {
  nodeId: string;
  depth: number;
  branches: string[];
  score: number;
  tier: 1 | 2 | 3;
  reasons: string[];
};

type BuildSessionState = {
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

interface StoreState {
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
  setNodeMode: (nodeId: string, mode: 'explore' | 'build', source: 'auto' | 'manual') => void;
  setBuildDeliverable: (deliverable: string) => void;
  setBuildScopeConfig: (config: Partial<Pick<BuildSessionState, 'direction' | 'maxDepth'>>) => void;
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
  createChildNode: (parentId: string, prompt: string, orchestration?: Partial<OrchestrationMetadata>) => string | null;
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

type SerializedNode = Omit<Node, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

type SerializedEdge = Omit<Edge, 'createdAt'> & {
  createdAt: string;
};


export const mapToArray = <T>(map: Map<string, T>): T[] => Array.from(map.values());

const arrayToMap = <T extends { id: string }>(array: T[]): Map<string, T> =>
  new Map(array.map((item) => [item.id, item]));

const serializeNode = (node: Node): SerializedNode => ({
  ...node,
  createdAt: node.createdAt.toISOString(),
  updatedAt: node.updatedAt.toISOString(),
});

const serializeEdge = (edge: Edge): SerializedEdge => ({
  ...edge,
  createdAt: edge.createdAt.toISOString(),
});

const deserializeNode = (node: SerializedNode | Node): Node => ({
  ...node,
  createdAt: node.createdAt instanceof Date ? node.createdAt : new Date(node.createdAt),
  updatedAt: node.updatedAt instanceof Date ? node.updatedAt : new Date(node.updatedAt),
});

const deserializeEdge = (edge: SerializedEdge | Edge): Edge => ({
  ...edge,
  createdAt: edge.createdAt instanceof Date ? edge.createdAt : new Date(edge.createdAt),
});

type HistorySnapshot = {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  selectedNodeIds: Set<string>;
  currentProjectName: string;
};

type HistoryState = {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  lastKey: string | null;
  lastAt: number;
};

const deepClone = <T>(value: T): T => {
  const cloneFn = (globalThis as unknown as { structuredClone?: (input: unknown) => unknown }).structuredClone;
  if (typeof cloneFn === 'function') {
    return cloneFn(value) as T;
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const createSnapshot = (state: Pick<StoreState, 'nodes' | 'edges' | 'selectedNodeIds' | 'currentProjectName'>): HistorySnapshot => ({
  nodes: new Map(Array.from(state.nodes.entries()).map(([id, node]) => [id, deepClone(node)])),
  edges: new Map(Array.from(state.edges.entries()).map(([id, edge]) => [id, deepClone(edge)])),
  selectedNodeIds: new Set(Array.from(state.selectedNodeIds.values())),
  currentProjectName: state.currentProjectName,
});

const applySnapshot = (state: StoreState, snapshot: HistorySnapshot) => {
  state.nodes = new Map(Array.from(snapshot.nodes.entries()).map(([id, node]) => [id, deepClone(node)]));
  state.edges = new Map(Array.from(snapshot.edges.entries()).map(([id, edge]) => [id, deepClone(edge)]));
  state.selectedNodeIds = new Set(Array.from(snapshot.selectedNodeIds.values()));
  state.currentProjectName = snapshot.currentProjectName;
};

const shouldPushHistory = (history: HistoryState, key: string) => {
  const now = Date.now();
  const shouldSkip = history.lastKey === key && now - history.lastAt < 750;
  history.lastKey = key;
  history.lastAt = now;
  return !shouldSkip;
};

function detectModeFromPrompt(prompt: string): 'explore' | 'build' {
  const text = prompt.trim().toLowerCase();
  if (!text) return 'explore';

  const buildSignals = [
    'plan',
    'build',
    'create',
    'implement',
    'generate',
    'roadmap',
    'deliverable',
    'mvp',
    'spec',
  ];

  const exploreSignals = ['explain', 'why', 'how', 'compare', 'summarize', 'resume'];

  const hasBuild = buildSignals.some((s) => text.includes(s));
  const hasExplore = exploreSignals.some((s) => text.includes(s));

  if (hasBuild && !hasExplore) return 'build';
  if (hasExplore && !hasBuild) return 'explore';
  if (text.includes('plan')) return 'build';
  return 'explore';
}

function isCriticalPrompt(prompt: string): boolean {
  const text = prompt.trim().toLowerCase();
  if (!text) return false;

  const criticalSignals = [
    'contrainte',
    'constraint',
    'requirement',
    'exigence',
    'non-goal',
    'non goal',
    'risque',
    'risk',
    'decision',
    'decision',
    'must',
    'critical',
    'critique',
  ];

  return criticalSignals.some((s) => text.includes(s));
}

function computeBuildScopeSnapshot(params: {
  rootNodeId: string;
  nodes: Map<string, Node>;
  direction: BuildScopeDirection;
  maxDepth: number;
}): {
  scopeNodes: Map<string, BuildScopeNode>;
  suggestedIncludedNodeIds: Set<string>;
  suggestedExcludedNodeIds: Set<string>;
  pinnedNodeIds: Set<string>;
} {
  const scopeEntries = computeScope(params.rootNodeId, params.nodes, { direction: params.direction, maxDepth: params.maxDepth });

  const scopeNodes = new Map<string, BuildScopeNode>();
  const suggestedIncludedNodeIds = new Set<string>();
  const suggestedExcludedNodeIds = new Set<string>();
  const pinnedNodeIds = new Set<string>();

  for (const [nodeId, entry] of scopeEntries.entries()) {
    const node = params.nodes.get(nodeId);
    if (!node) continue;

    const pinned = isPinned(node.metadata);
    if (pinned) {
      pinnedNodeIds.add(nodeId);
    }

    const scored = computeHeuristicScore(node, entry);

    scopeNodes.set(nodeId, {
      nodeId,
      depth: entry.depth,
      branches: entry.branches,
      score: scored.score,
      tier: scored.tier,
      reasons: scored.reasons,
    });

    const includeByDefault = pinned || nodeId === params.rootNodeId || scored.tier !== 3;
    if (includeByDefault) {
      suggestedIncludedNodeIds.add(nodeId);
    } else {
      suggestedExcludedNodeIds.add(nodeId);
    }
  }

  return {
    scopeNodes,
    suggestedIncludedNodeIds,
    suggestedExcludedNodeIds,
    pinnedNodeIds,
  };
}

export const useStore = create<StoreState>()(
  persist(
    immer((set, get) => ({
      nodes: new Map(),
      edges: new Map(),
      selectedNodeIds: new Set(),
      settings: {
        systemPrompt: '',
        defaultModel: 'glm-4.7',
      },
      quickActions: defaultQuickActions,
      ui: {
        sidebarOpen: true,
        activeModal: null,
        activeQuickActionId: null,
        focusModeNodeId: null,
      },
      promptFocusNodeId: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      currentProjectId: null,
      currentProjectName: 'Untitled project',
      history: { past: [], future: [], lastKey: null, lastAt: 0 },
      buildSession: null,

      startBuildSession: (rootNodeId) => {
        set((state) => {
          const root = state.nodes.get(rootNodeId);
          if (!root) return;

          const direction: BuildScopeDirection = 'both';
          const maxDepth = 3;

          const snapshot = computeBuildScopeSnapshot({ rootNodeId, nodes: state.nodes, direction, maxDepth });

          state.buildSession = {
            rootNodeId,
            deliverable: '',
            direction,
            maxDepth,
            scopeNodes: snapshot.scopeNodes,
            includedNodeIds: new Set(snapshot.suggestedIncludedNodeIds),
            excludedNodeIds: new Set(snapshot.suggestedExcludedNodeIds),
            pinnedNodeIds: new Set(snapshot.pinnedNodeIds),
            suggestedIncludedNodeIds: new Set(snapshot.suggestedIncludedNodeIds),
            suggestedExcludedNodeIds: new Set(snapshot.suggestedExcludedNodeIds),
            frozenSuggestions: true,
            impactGlobalDetected: false,
            impactedBranchIds: new Set(),
          };
        });
      },

      startBuildFromNode: (rootNodeId) => {
        set((state) => {
          const root = state.nodes.get(rootNodeId);
          if (!root) return;

          root.metadata = writeOrchestrationMetadata(root.metadata, { mode: 'build', modeSource: 'manual' });
          root.updatedAt = new Date();

          const direction: BuildScopeDirection = 'both';
          const maxDepth = 3;

          const snapshot = computeBuildScopeSnapshot({ rootNodeId, nodes: state.nodes, direction, maxDepth });

          state.buildSession = {
            rootNodeId,
            deliverable: '',
            direction,
            maxDepth,
            scopeNodes: snapshot.scopeNodes,
            includedNodeIds: new Set(snapshot.suggestedIncludedNodeIds),
            excludedNodeIds: new Set(snapshot.suggestedExcludedNodeIds),
            pinnedNodeIds: new Set(snapshot.pinnedNodeIds),
            suggestedIncludedNodeIds: new Set(snapshot.suggestedIncludedNodeIds),
            suggestedExcludedNodeIds: new Set(snapshot.suggestedExcludedNodeIds),
            frozenSuggestions: true,
            impactGlobalDetected: false,
            impactedBranchIds: new Set(),
          };
        });
      },

      startPlanScopeEdit: (planNodeId) => {
        set((state) => {
          const planNode = state.nodes.get(planNodeId);
          if (!planNode) return;

          const orchestration = readOrchestrationMetadata(planNode.metadata);
          const buildRootNodeId = orchestration.plan?.buildRootNodeId ?? planNodeId;

          const direction: BuildScopeDirection = 'both';
          const maxDepth = 3;

          const snapshot = computeBuildScopeSnapshot({ rootNodeId: buildRootNodeId, nodes: state.nodes, direction, maxDepth });

          const includedFromPlan = new Set<string>(planNode.parentIds);
          includedFromPlan.add(buildRootNodeId);

          const excludedFromPlan = new Set<string>();
          for (const nodeId of snapshot.scopeNodes.keys()) {
            if (!includedFromPlan.has(nodeId)) {
              excludedFromPlan.add(nodeId);
            }
          }

          state.buildSession = {
            rootNodeId: buildRootNodeId,
            deliverable: orchestration.plan?.deliverable ?? '',
            direction,
            maxDepth,
            scopeNodes: snapshot.scopeNodes,
            includedNodeIds: includedFromPlan,
            excludedNodeIds: excludedFromPlan,
            pinnedNodeIds: new Set(snapshot.pinnedNodeIds),
            suggestedIncludedNodeIds: new Set(snapshot.suggestedIncludedNodeIds),
            suggestedExcludedNodeIds: new Set(snapshot.suggestedExcludedNodeIds),
            frozenSuggestions: true,
            impactGlobalDetected: false,
            impactedBranchIds: new Set(),
            targetPlanNodeId: planNodeId,
          };
        });
      },

      applyBuildScopeToPlan: () => {
        set((state) => {
          const session = state.buildSession;
          if (!session?.targetPlanNodeId) return;

          const planNode = state.nodes.get(session.targetPlanNodeId);
          if (!planNode) return;

          const nextParentIds = Array.from(session.includedNodeIds).filter((id) => id !== planNode.id);

          for (const oldParentId of [...planNode.parentIds]) {
            planNode.parentIds = planNode.parentIds.filter((pid) => pid !== oldParentId);
            const parent = state.nodes.get(oldParentId);
            if (parent) {
              parent.childrenIds = parent.childrenIds.filter((cid) => cid !== planNode.id);
            }

            for (const [edgeId, edge] of state.edges.entries()) {
              if (edge.source === oldParentId && edge.target === planNode.id) {
                state.edges.delete(edgeId);
              }
            }
          }

          const now = new Date();
          for (const parentId of nextParentIds) {
            const parent = state.nodes.get(parentId);
            if (!parent) continue;

            const edgeId = generateEdgeId();
            state.edges.set(edgeId, { id: edgeId, source: parentId, target: planNode.id, createdAt: now });

            if (!parent.childrenIds.includes(planNode.id)) {
              parent.childrenIds.push(planNode.id);
            }
            if (!planNode.parentIds.includes(parentId)) {
              planNode.parentIds.push(parentId);
            }
          }

          planNode.updatedAt = now;
          if (planNode.status !== 'loading') {
            planNode.status = 'stale';
          }

          const orch = readOrchestrationMetadata(planNode.metadata);
          if (orch.plan) {
            planNode.metadata = writeOrchestrationMetadata(planNode.metadata, { plan: { ...orch.plan, isStale: true } });
          }

          state.buildSession = null;
        });
      },

      setNodeMode: (nodeId, mode, source) => {
        set((state) => {
          const node = state.nodes.get(nodeId);
          if (!node) return;
          node.metadata = writeOrchestrationMetadata(node.metadata, { mode, modeSource: source });
          node.updatedAt = new Date();
        });
      },

      endBuildSession: () => {
        set((state) => {
          state.buildSession = null;
        });
      },

      setBuildDeliverable: (deliverable) => {
        set((state) => {
          if (!state.buildSession) return;
          state.buildSession.deliverable = deliverable;
        });
      },

      setBuildScopeConfig: (config) => {
        set((state) => {
          if (!state.buildSession) return;
          if (config.direction) {
            state.buildSession.direction = config.direction;
          }
          if (typeof config.maxDepth === 'number' && config.maxDepth >= 0) {
            state.buildSession.maxDepth = config.maxDepth;
          }

          const snapshot = computeBuildScopeSnapshot({
            rootNodeId: state.buildSession.rootNodeId,
            nodes: state.nodes,
            direction: state.buildSession.direction,
            maxDepth: state.buildSession.maxDepth,
          });

          state.buildSession.scopeNodes = snapshot.scopeNodes;
          state.buildSession.suggestedIncludedNodeIds = snapshot.suggestedIncludedNodeIds;
          state.buildSession.suggestedExcludedNodeIds = snapshot.suggestedExcludedNodeIds;
          state.buildSession.pinnedNodeIds = snapshot.pinnedNodeIds;
          state.buildSession.includedNodeIds = new Set(snapshot.suggestedIncludedNodeIds);
          state.buildSession.excludedNodeIds = new Set(snapshot.suggestedExcludedNodeIds);
          state.buildSession.frozenSuggestions = true;
          state.buildSession.impactGlobalDetected = false;
          state.buildSession.impactedBranchIds = new Set();
        });
      },

      recomputeBuildSuggestions: (params) => {
        set((state) => {
          if (!state.buildSession) return;

          const branchId = params?.branchId ?? null;

          if (!branchId) {
            const snapshot = computeBuildScopeSnapshot({
              rootNodeId: state.buildSession.rootNodeId,
              nodes: state.nodes,
              direction: state.buildSession.direction,
              maxDepth: state.buildSession.maxDepth,
            });

            state.buildSession.scopeNodes = snapshot.scopeNodes;
            state.buildSession.suggestedIncludedNodeIds = snapshot.suggestedIncludedNodeIds;
            state.buildSession.suggestedExcludedNodeIds = snapshot.suggestedExcludedNodeIds;
            state.buildSession.pinnedNodeIds = snapshot.pinnedNodeIds;
            state.buildSession.frozenSuggestions = true;
            state.buildSession.impactGlobalDetected = false;
            state.buildSession.impactedBranchIds = new Set();
            return;
          }

          const nextScopeNodes = new Map(state.buildSession.scopeNodes);
          const nextSuggestedIncluded = new Set(state.buildSession.suggestedIncludedNodeIds);
          const nextSuggestedExcluded = new Set(state.buildSession.suggestedExcludedNodeIds);

          const snapshot = computeBuildScopeSnapshot({
            rootNodeId: state.buildSession.rootNodeId,
            nodes: state.nodes,
            direction: state.buildSession.direction,
            maxDepth: state.buildSession.maxDepth,
          });

          for (const [nodeId, scoped] of snapshot.scopeNodes.entries()) {
            if (!scoped.branches.includes(branchId)) continue;
            nextScopeNodes.set(nodeId, scoped);

            if (snapshot.suggestedIncludedNodeIds.has(nodeId)) {
              nextSuggestedIncluded.add(nodeId);
              nextSuggestedExcluded.delete(nodeId);
            } else if (snapshot.suggestedExcludedNodeIds.has(nodeId)) {
              nextSuggestedExcluded.add(nodeId);
              nextSuggestedIncluded.delete(nodeId);
            }
          }

          state.buildSession.scopeNodes = nextScopeNodes;
          state.buildSession.suggestedIncludedNodeIds = nextSuggestedIncluded;
          state.buildSession.suggestedExcludedNodeIds = nextSuggestedExcluded;
          state.buildSession.frozenSuggestions = true;
        });
      },

      toggleBuildInclude: (nodeId) => {
        set((state) => {
          if (!state.buildSession) return;
          state.buildSession.excludedNodeIds.delete(nodeId);
          if (state.buildSession.includedNodeIds.has(nodeId)) {
            state.buildSession.includedNodeIds.delete(nodeId);
            state.buildSession.excludedNodeIds.add(nodeId);
          } else {
            state.buildSession.includedNodeIds.add(nodeId);
          }
        });
      },

      toggleBuildExclude: (nodeId) => {
        set((state) => {
          if (!state.buildSession) return;
          state.buildSession.includedNodeIds.delete(nodeId);
          if (state.buildSession.excludedNodeIds.has(nodeId)) {
            state.buildSession.excludedNodeIds.delete(nodeId);
            state.buildSession.includedNodeIds.add(nodeId);
          } else {
            state.buildSession.excludedNodeIds.add(nodeId);
          }
        });
      },

      toggleBuildPin: (nodeId) => {
        set((state) => {
          const node = state.nodes.get(nodeId);
          if (!node) return;

          const pinned = isPinned(node.metadata);
          const nextPinned = !pinned;

          node.metadata = writeOrchestrationMetadata(node.metadata, { pinned: nextPinned });
          node.updatedAt = new Date();

          if (state.buildSession) {
            if (nextPinned) {
              state.buildSession.pinnedNodeIds.add(nodeId);
              state.buildSession.includedNodeIds.add(nodeId);
              state.buildSession.excludedNodeIds.delete(nodeId);
            } else {
              state.buildSession.pinnedNodeIds.delete(nodeId);
            }
          }
        });
      },

      includeBuildBranch: (branchId) => {
        set((state) => {
          const session = state.buildSession;
          if (!session) return;

          for (const [nodeId, scoped] of session.scopeNodes.entries()) {
            if (!scoped.branches.includes(branchId)) continue;
            session.includedNodeIds.add(nodeId);
            session.excludedNodeIds.delete(nodeId);
          }
        });
      },

      excludeBuildBranch: (branchId) => {
        set((state) => {
          const session = state.buildSession;
          if (!session) return;

          for (const [nodeId, scoped] of session.scopeNodes.entries()) {
            if (!scoped.branches.includes(branchId)) continue;
            if (session.pinnedNodeIds.has(nodeId)) continue;
            session.excludedNodeIds.add(nodeId);
            session.includedNodeIds.delete(nodeId);
          }
        });
      },

      pinBuildBranch: (branchId) => {
        set((state) => {
          const session = state.buildSession;
          if (!session) return;

          for (const [nodeId, scoped] of session.scopeNodes.entries()) {
            if (!scoped.branches.includes(branchId)) continue;

            const node = state.nodes.get(nodeId);
            if (!node) continue;

            node.metadata = writeOrchestrationMetadata(node.metadata, { pinned: true });
            node.updatedAt = new Date();

            session.pinnedNodeIds.add(nodeId);
            session.includedNodeIds.add(nodeId);
            session.excludedNodeIds.delete(nodeId);
          }
        });
      },

      unpinBuildBranch: (branchId) => {
        set((state) => {
          const session = state.buildSession;
          if (!session) return;

          for (const [nodeId, scoped] of session.scopeNodes.entries()) {
            if (!scoped.branches.includes(branchId)) continue;

            const node = state.nodes.get(nodeId);
            if (!node) continue;

            node.metadata = writeOrchestrationMetadata(node.metadata, { pinned: false });
            node.updatedAt = new Date();

            session.pinnedNodeIds.delete(nodeId);
          }
        });
      },

      resetBuildToSuggested: () => {
        set((state) => {
          if (!state.buildSession) return;
          state.buildSession.includedNodeIds = new Set(state.buildSession.suggestedIncludedNodeIds);
          state.buildSession.excludedNodeIds = new Set(state.buildSession.suggestedExcludedNodeIds);
        });
      },

      generatePlanFromBuildSession: () => {
        const now = new Date();
        let createdPlanId: string | null = null;

        set((state) => {
          const session = state.buildSession;
          if (!session) return;
          if (!session.deliverable.trim()) return;

          const root = state.nodes.get(session.rootNodeId);
          if (!root) return;

          const included = Array.from(session.includedNodeIds);
          if (!included.includes(session.rootNodeId)) {
            included.push(session.rootNodeId);
          }

          included.sort();
          const scopeHash = included.join('|');

          const planNodeId = generateNodeId();
          createdPlanId = planNodeId;

          const version = 1;
          const createdAt = now.toISOString();

          const prompt = [
            `Objective: produce an excellent project plan for: ${session.deliverable}`,
            '',
            'Constraints:',
            '- Respond in structured Markdown (titles, lists, checklists).',
            '- Start with an ultra-concise summary.',
            '- Include: scope, milestones, risks, delivery plan, success criteria.',
            '- Use the context provided by parent nodes.',
          ].join('\n');

          const metadata = writeOrchestrationMetadata(undefined, {
            logicalRole: 'plan',
            mode: 'build',
            modeSource: 'manual',
            plan: {
              versions: [{ version, content: '', createdAt, scopeHash }],
              activeVersion: version,
              isStale: false,
              deliverable: session.deliverable,
              scopeHash,
              buildRootNodeId: session.rootNodeId,
            },
          });

          state.nodes.set(planNodeId, {
            id: planNodeId,
            prompt,
            response: '',
            status: 'idle',
            position: { x: root.position.x + 320, y: root.position.y + 40 },
            parentIds: [],
            childrenIds: [],
            createdAt: now,
            updatedAt: now,
            metadata,
          });

          const addEdgeInternal = (sourceId: string, targetId: string) => {
            const already = Array.from(state.edges.values()).some((edge) => edge.source === sourceId && edge.target === targetId);
            if (already) return;

            const edgeId = generateEdgeId();
            state.edges.set(edgeId, {
              id: edgeId,
              source: sourceId,
              target: targetId,
              createdAt: now,
            });

            const sourceNode = state.nodes.get(sourceId);
            const targetNode = state.nodes.get(targetId);
            if (sourceNode && targetNode) {
              if (!sourceNode.childrenIds.includes(targetId)) {
                sourceNode.childrenIds.push(targetId);
              }
              if (!targetNode.parentIds.includes(sourceId)) {
                targetNode.parentIds.push(sourceId);
              }
            }
          };

          for (const nodeId of included) {
            addEdgeInternal(nodeId, planNodeId);
          }

          state.buildSession = null;
        });

        if (createdPlanId) {
          setTimeout(() => {
            const event = new CustomEvent('node:generate', { detail: { nodeId: createdPlanId } });
            window.dispatchEvent(event);
          }, 50);
        }

        return createdPlanId;
      },

      generateArtifactFromPlan: (planNodeId) => {
        const now = new Date();
        let createdArtifactId: string | null = null;

        set((state) => {
          const planNode = state.nodes.get(planNodeId);
          if (!planNode) return;

          const orchestration = readOrchestrationMetadata(planNode.metadata);
          const deliverable = orchestration.plan?.deliverable ?? 'Artifact';

          const parentIds = [...planNode.parentIds];
          parentIds.sort();
          const scopeHash = parentIds.join('|');

          const artifactNodeId = generateNodeId();
          createdArtifactId = artifactNodeId;

          const prompt = [
            `Objective: produce a deliverable (artifact) from the plan and context.`,
            '',
            `Deliverable: ${deliverable}`,
            '',
            'Contraintes:',
            '- Respond in structured and directly usable Markdown.',
            '- Strictly follow the active plan.',
            '- Include necessary sections (e.g., intro, steps, checklists, appendices).',
          ].join('\n');

          const metadata = writeOrchestrationMetadata(undefined, {
            logicalRole: 'artifact',
            mode: 'build',
            modeSource: 'manual',
            artifact: { isFinal: false },
          });

          state.nodes.set(artifactNodeId, {
            id: artifactNodeId,
            prompt,
            response: '',
            status: 'idle',
            position: { x: planNode.position.x + 320, y: planNode.position.y + 60 },
            parentIds: [],
            childrenIds: [],
            createdAt: now,
            updatedAt: now,
            metadata,
          });

          const addEdgeInternal = (sourceId: string, targetId: string) => {
            const already = Array.from(state.edges.values()).some((edge) => edge.source === sourceId && edge.target === targetId);
            if (already) return;

            const edgeId = generateEdgeId();
            state.edges.set(edgeId, {
              id: edgeId,
              source: sourceId,
              target: targetId,
              createdAt: now,
            });

            const sourceNode = state.nodes.get(sourceId);
            const targetNode = state.nodes.get(targetId);
            if (sourceNode && targetNode) {
              if (!sourceNode.childrenIds.includes(targetId)) {
                sourceNode.childrenIds.push(targetId);
              }
              if (!targetNode.parentIds.includes(sourceId)) {
                targetNode.parentIds.push(sourceId);
              }
            }
          };

          addEdgeInternal(planNodeId, artifactNodeId);

          for (const pid of parentIds) {
            addEdgeInternal(pid, artifactNodeId);
          }

          const created = state.nodes.get(artifactNodeId);
          if (created) {
            created.metadata = writeOrchestrationMetadata(created.metadata, {
              artifact: { isFinal: false },
              scoreExplanation: { reason: `Derived from plan scope: ${scopeHash.slice(0, 40)}` },
            });
          }
        });

        if (createdArtifactId) {
          setTimeout(() => {
            const event = new CustomEvent('node:generate', { detail: { nodeId: createdArtifactId } });
            window.dispatchEvent(event);
          }, 50);
        }

        return createdArtifactId;
      },

      generateTodoFromPlan: (planNodeId) => {
        const now = new Date();
        let createdTodoId: string | null = null;

        set((state) => {
          const planNode = state.nodes.get(planNodeId);
          if (!planNode) return;

          const orchestration = readOrchestrationMetadata(planNode.metadata);
          const deliverable = orchestration.plan?.deliverable ?? 'Todo';

          const todoNodeId = generateNodeId();
          createdTodoId = todoNodeId;

          const prompt = [
            `Objectif: transformer le plan en une liste de tâches actionnables (todo).`,
            '',
            `Contexte: ${deliverable}`,
            '',
            'Contraintes:',
            '- Return a structured Markdown list (checklist) with 10-25 items.',
            '- Group by sections if necessary.',
            '- Each item must be actionable and concrete.',
          ].join('\n');

          const metadata = writeOrchestrationMetadata(undefined, {
            logicalRole: 'artifact',
            mode: 'build',
            modeSource: 'manual',
            todo: { items: [], derivedFromPlanNodeId: planNodeId },
          });

          state.nodes.set(todoNodeId, {
            id: todoNodeId,
            prompt,
            response: '',
            status: 'idle',
            position: { x: planNode.position.x + 320, y: planNode.position.y + 220 },
            parentIds: [],
            childrenIds: [],
            createdAt: now,
            updatedAt: now,
            metadata,
          });

          const addEdgeInternal = (sourceId: string, targetId: string) => {
            const already = Array.from(state.edges.values()).some((edge) => edge.source === sourceId && edge.target === targetId);
            if (already) return;

            const edgeId = generateEdgeId();
            state.edges.set(edgeId, { id: edgeId, source: sourceId, target: targetId, createdAt: now });

            const sourceNode = state.nodes.get(sourceId);
            const targetNode = state.nodes.get(targetId);
            if (sourceNode && targetNode) {
              if (!sourceNode.childrenIds.includes(targetId)) {
                sourceNode.childrenIds.push(targetId);
              }
              if (!targetNode.parentIds.includes(sourceId)) {
                targetNode.parentIds.push(sourceId);
              }
            }
          };

          addEdgeInternal(planNodeId, todoNodeId);
          for (const pid of planNode.parentIds) {
            addEdgeInternal(pid, todoNodeId);
          }
        });

        if (createdTodoId) {
          setTimeout(() => {
            const event = new CustomEvent('node:generate', { detail: { nodeId: createdTodoId } });
            window.dispatchEvent(event);
          }, 50);
        }

        return createdTodoId;
      },

      refreshPlanVersion: (planNodeId) => {
        const now = new Date();

        set((state) => {
          const node = state.nodes.get(planNodeId);
          if (!node) return;

          const orchestration = readOrchestrationMetadata(node.metadata);
          const plan = orchestration.plan;
          if (!plan || !Array.isArray(plan.versions)) return;

          const versions = plan.versions;
          const maxVersion = versions.reduce((acc, v) => (typeof v.version === 'number' && v.version > acc ? v.version : acc), 0);
          const nextVersion = maxVersion + 1;

          const parentIds = [...node.parentIds].sort();
          const scopeHash = parentIds.join('|');

          const deliverable = plan.deliverable ?? 'Plan';

          const prompt = [
            `Objective: refresh the project plan for: ${deliverable}`,
            '',
            'Constraints:',
            '- Respond in structured Markdown (titles, lists, checklists).',
            '- Update the plan taking into account context changes.',
            '- Use the context provided by parent nodes.',
          ].join('\n');

          const createdAt = now.toISOString();

          const nextPlan = {
            ...plan,
            versions: [...versions, { version: nextVersion, content: '', createdAt, scopeHash }],
            activeVersion: nextVersion,
            isStale: false,
            scopeHash,
          };

          node.prompt = prompt;
          node.response = '';
          node.status = 'idle';
          node.updatedAt = now;
          node.metadata = writeOrchestrationMetadata(node.metadata, { logicalRole: 'plan', plan: nextPlan });
        });

        setTimeout(() => {
          const event = new CustomEvent('node:generate', { detail: { nodeId: planNodeId } });
          window.dispatchEvent(event);
        }, 50);
      },

      setActivePlanVersion: (planNodeId, version) => {
        set((state) => {
          const node = state.nodes.get(planNodeId);
          if (!node) return;

          const orchestration = readOrchestrationMetadata(node.metadata);
          const plan = orchestration.plan;
          if (!plan || !Array.isArray(plan.versions)) return;

          const selected = plan.versions.find((v) => v.version === version);
          if (!selected) return;

          const nextPlan = {
            ...plan,
            activeVersion: version,
          };

          node.response = selected.content;
          node.status = 'idle';
          node.updatedAt = new Date();
          node.metadata = writeOrchestrationMetadata(node.metadata, { logicalRole: 'plan', plan: nextPlan });
        });
      },

      undo: () => {
        const snapshot = createSnapshot(get());
        set((state) => {
          const previous = state.history.past.pop();
          if (!previous) return;

          state.history.future.push(snapshot);
          applySnapshot(state, previous);
          state.history.lastKey = null;
        });
      },

      redo: () => {
        const snapshot = createSnapshot(get());
        set((state) => {
          const next = state.history.future.pop();
          if (!next) return;

          state.history.past.push(snapshot);
          applySnapshot(state, next);
          state.history.lastKey = null;
        });
      },

      addNode: (position) => {
        const snapshot = createSnapshot(get());
        const id = generateNodeId();
        const now = new Date();
        const node: Node = {
          id,
          prompt: '',
          response: '',
          status: 'idle',
          position,
          parentIds: [],
          childrenIds: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => {
          if (shouldPushHistory(state.history, 'addNode')) {
            state.history.past.push(snapshot);
            if (state.history.past.length > 50) {
              state.history.past.shift();
            }
            state.history.future = [];
          }

          state.nodes.set(id, node);
        });
        return id;
      },

      addNodeWithPrompt: (position, prompt) => {
        const snapshot = createSnapshot(get());
        const id = generateNodeId();
        const now = new Date();
        const node: Node = {
          id,
          prompt,
          response: '',
          status: 'idle',
          position,
          parentIds: [],
          childrenIds: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => {
          if (shouldPushHistory(state.history, 'addNode')) {
            state.history.past.push(snapshot);
            if (state.history.past.length > 50) {
              state.history.past.shift();
            }
            state.history.future = [];
          }

          state.nodes.set(id, node);
        });
        return id;
      },

      createChildNode: (parentId, prompt, orchestration) => {
        const parent = get().nodes.get(parentId);
        if (!parent) return null;

        const childId = get().addNodeWithPrompt({ x: parent.position.x + 60, y: parent.position.y + 320 }, prompt);
        const edgeId = get().addEdge(parentId, childId);
        if (!edgeId) {
          return childId;
        }

        if (orchestration) {
          const child = get().nodes.get(childId);
          if (child) {
            const metadata = writeOrchestrationMetadata(child.metadata, orchestration);
            get().updateNode(childId, { metadata });
          }
        }

        return childId;
      },

      updateNode: (id, updates) => {
        set((state) => {
          const node = state.nodes.get(id);
          if (node) {
            Object.assign(node, updates, { updatedAt: new Date() });
          }
        });
      },

      deleteNode: (id) => {
        const snapshot = createSnapshot(get());
        set((state) => {
          if (shouldPushHistory(state.history, 'deleteNode')) {
            state.history.past.push(snapshot);
            if (state.history.past.length > 50) {
              state.history.past.shift();
            }
            state.history.future = [];
          }

          const node = state.nodes.get(id);
          if (!node) return;

          node.parentIds.forEach((parentId) => {
            const parent = state.nodes.get(parentId);
            if (parent) {
              parent.childrenIds = parent.childrenIds.filter((cid) => cid !== id);
            }
          });

          node.childrenIds.forEach((childId) => {
            const child = state.nodes.get(childId);
            if (child) {
              child.parentIds = child.parentIds.filter((pid) => pid !== id);
            }
          });

          state.edges.forEach((edge, edgeId) => {
            if (edge.source === id || edge.target === id) {
              state.edges.delete(edgeId);
            }
          });

          state.selectedNodeIds.delete(id);
          state.nodes.delete(id);
        });
      },

      setNodeStatus: (id, status) => {
        set((state) => {
          const node = state.nodes.get(id);
          if (!node) return;

          node.status = status;
          node.updatedAt = new Date();

          if (status === 'stale') {
            const orchestration = readOrchestrationMetadata(node.metadata);
            if (orchestration.logicalRole === 'plan' && orchestration.plan) {
              node.metadata = writeOrchestrationMetadata(node.metadata, {
                plan: { ...orchestration.plan, isStale: true },
              });
            }
          }
        });
      },

       updateNodePrompt: (id, prompt) => {
         const current = get().nodes.get(id);
         if (!current) return;
         if (current.prompt === prompt) return;

         const snapshot = createSnapshot(get());

         set((state) => {
           const node = state.nodes.get(id);
           if (!node) return;

           if (shouldPushHistory(state.history, `prompt:${id}`)) {
             state.history.past.push(snapshot);
             if (state.history.past.length > 50) {
               state.history.past.shift();
             }
             state.history.future = [];
           }


           const previousPrompt = node.prompt;
           node.prompt = prompt;
           node.updatedAt = new Date();

           const orchestration = readOrchestrationMetadata(node.metadata);
           if (orchestration.modeSource !== 'manual') {
             const mode = detectModeFromPrompt(prompt);
             node.metadata = writeOrchestrationMetadata(node.metadata, { mode, modeSource: 'auto' });
           }


          if (previousPrompt !== prompt) {
            const queue = [...node.childrenIds];
            const visited = new Set<string>();

            while (queue.length > 0) {
              const currentId = queue.shift();
              if (!currentId) continue;
              if (visited.has(currentId)) continue;
              visited.add(currentId);

              const child = state.nodes.get(currentId);
               if (child) {
                 if (child.status !== 'loading') {
                   child.status = 'stale';
                 }
                 child.updatedAt = new Date();

                 const orchestration = readOrchestrationMetadata(child.metadata);
                 if (orchestration.logicalRole === 'plan' && orchestration.plan) {
                   child.metadata = writeOrchestrationMetadata(child.metadata, {
                     plan: { ...orchestration.plan, isStale: true },
                   });
                 }

                 queue.push(...child.childrenIds);
               }

            }
          }
        });
      },

      updateNodeResponse: (id, response) => {
        set((state) => {
          const node = state.nodes.get(id);
          if (node) {
            node.response = response;
            node.updatedAt = new Date();
          }
        });
      },

      updateNodeSummary: (id, summary) => {
        set((state) => {
          const node = state.nodes.get(id);
          if (node) {
            node.summary = summary;
            node.updatedAt = new Date();
          }
        });
      },

      setNodes: (nodes) => {
        set((state) => {
          state.nodes = nodes;
        });
      },

      addEdge: (sourceId, targetId) => {
        const state = get();
        const existingEdge = Array.from(state.edges.values()).find(
          (edge) => edge.source === sourceId && edge.target === targetId
        );
        if (existingEdge) return null;

        const snapshot = createSnapshot(get());
        const id = generateEdgeId();
        set((state) => {
          if (shouldPushHistory(state.history, 'addEdge')) {
            state.history.past.push(snapshot);
            if (state.history.past.length > 50) {
              state.history.past.shift();
            }
            state.history.future = [];
          }

          state.edges.set(id, {
            id,
            source: sourceId,
            target: targetId,
            createdAt: new Date(),
          });

          const sourceNode = state.nodes.get(sourceId);
          const targetNode = state.nodes.get(targetId);
          if (sourceNode && targetNode) {
            if (!sourceNode.childrenIds.includes(targetId)) {
              sourceNode.childrenIds.push(targetId);
            }
            if (!targetNode.parentIds.includes(sourceId)) {
              targetNode.parentIds.push(sourceId);
            }
          }

          const session = state.buildSession;
          if (session && sourceNode && targetNode) {
            const rootId = session.rootNodeId;
            const branchIds = sourceId === rootId ? [targetId] : (session.scopeNodes.get(sourceId)?.branches ?? []);

            if (branchIds.length > 0) {
              const snapshotNow = computeBuildScopeSnapshot({
                rootNodeId: rootId,
                nodes: state.nodes,
                direction: session.direction,
                maxDepth: session.maxDepth,
              });

              for (const branchId of branchIds) {
                for (const [nodeId, scoped] of snapshotNow.scopeNodes.entries()) {
                  if (!scoped.branches.includes(branchId)) continue;

                  session.scopeNodes.set(nodeId, scoped);

                  if (snapshotNow.suggestedIncludedNodeIds.has(nodeId)) {
                    session.suggestedIncludedNodeIds.add(nodeId);
                    session.suggestedExcludedNodeIds.delete(nodeId);
                  } else if (snapshotNow.suggestedExcludedNodeIds.has(nodeId)) {
                    session.suggestedExcludedNodeIds.add(nodeId);
                    session.suggestedIncludedNodeIds.delete(nodeId);
                  }

                  if (!session.includedNodeIds.has(nodeId) && !session.excludedNodeIds.has(nodeId)) {
                    if (snapshotNow.suggestedIncludedNodeIds.has(nodeId)) {
                      session.includedNodeIds.add(nodeId);
                    } else {
                      session.excludedNodeIds.add(nodeId);
                    }
                  }
                }
              }

              session.pinnedNodeIds = snapshotNow.pinnedNodeIds;
              session.frozenSuggestions = true;

              const pivotDepth = session.scopeNodes.get(sourceId)?.depth;
              const closeToPivot = sourceId === rootId || (typeof pivotDepth === 'number' && pivotDepth <= 1);
              const multiParent = targetNode.parentIds.length > 1;
              const critical = isCriticalPrompt(targetNode.prompt);

              if (closeToPivot || multiParent || critical) {
                session.impactGlobalDetected = true;
                for (const branchId of branchIds) {
                  session.impactedBranchIds.add(branchId);
                }
              }
            }
          }
        });
        return id;
      },

      deleteEdge: (id) => {
        const snapshot = createSnapshot(get());
        set((state) => {
          if (shouldPushHistory(state.history, 'deleteEdge')) {
            state.history.past.push(snapshot);
            if (state.history.past.length > 50) {
              state.history.past.shift();
            }
            state.history.future = [];
          }

          const edge = state.edges.get(id);
          if (!edge) return;

          const sourceNode = state.nodes.get(edge.source);
          const targetNode = state.nodes.get(edge.target);
          if (sourceNode) {
            sourceNode.childrenIds = sourceNode.childrenIds.filter(
              (cid) => cid !== edge.target
            );
          }
          if (targetNode) {
            targetNode.parentIds = targetNode.parentIds.filter(
              (pid) => pid !== edge.source
            );
          }

          state.edges.delete(id);
        });
      },

      selectNode: (id) => {
        set((state) => {
          state.selectedNodeIds.add(id);
        });
      },

      deselectNode: (id) => {
        set((state) => {
          state.selectedNodeIds.delete(id);
        });
      },

      clearSelection: () => {
        set((state) => {
          state.selectedNodeIds.clear();
        });
      },

      toggleNodeSelection: (id) => {
        set((state) => {
          if (state.selectedNodeIds.has(id)) {
            state.selectedNodeIds.delete(id);
          } else {
            state.selectedNodeIds.add(id);
          }
        });
      },

      setSelectedNodeIds: (ids) => {
        set((state) => {
          state.selectedNodeIds = new Set(ids);
        });
      },

      updateSettings: (updates) => {
        set((state) => {
          Object.assign(state.settings, updates);
        });
      },

      addQuickAction: (label, instruction) => {
        const id = `qa-${generateId()}`;
        set((state) => {
          const order = state.quickActions.length;
          state.quickActions.push({ id, label, instruction, order });
        });
      },

      updateQuickAction: (id, updates) => {
        set((state) => {
          const index = state.quickActions.findIndex((qa) => qa.id === id);
          if (index !== -1) {
            Object.assign(state.quickActions[index], updates);
          }
        });
      },

      deleteQuickAction: (id) => {
        set((state) => {
          state.quickActions = state.quickActions.filter((qa) => qa.id !== id);
          state.quickActions.forEach((qa, index) => {
            qa.order = index;
          });
        });
      },

      reorderQuickActions: (quickActions) => {
        set((state) => {
          state.quickActions = quickActions.map((qa, index) => ({
            ...qa,
            order: index,
          }));
        });
      },

      toggleSidebar: () => {
        set((state) => {
          state.ui.sidebarOpen = !state.ui.sidebarOpen;
        });
      },

      setActiveModal: (modal) => {
        set((state) => {
          state.ui.activeModal = modal;
        });
      },

      setActiveQuickActionId: (id) => {
        set((state) => {
          state.ui.activeQuickActionId = id;
        });
      },

      setFocusModeNodeId: (nodeId) => {
        set((state) => {
          state.ui.focusModeNodeId = nodeId;
        });
      },

      setPromptFocusNodeId: (nodeId) => {
        set((state) => {
          state.promptFocusNodeId = nodeId;
        });
      },

      setCurrentProjectId: (id) => {
        set((state) => {
          state.currentProjectId = id;
        });
      },

      setCurrentProjectName: (name) => {
        set((state) => {
          state.currentProjectName = name;
        });
      },

      setViewport: (viewport) => {
        set((state) => {
          state.viewport = viewport;
        });
      },

       loadProject: (nodes, edges, settings, quickActions) => {
         set((state) => {
           state.nodes = arrayToMap(nodes);
           state.edges = arrayToMap(edges);
           state.settings = settings;
           state.quickActions = quickActions;
            state.selectedNodeIds.clear();
            state.history = { past: [], future: [], lastKey: null, lastAt: 0 };
            state.buildSession = null;
            state.promptFocusNodeId = null;

         });
       },

        clearAll: () => {
         set((state) => {
           state.nodes.clear();
           state.edges.clear();
           state.selectedNodeIds.clear();
           state.currentProjectId = null;
            state.currentProjectName = 'Untitled project';
            state.history = { past: [], future: [], lastKey: null, lastAt: 0 };
            state.buildSession = null;
            state.promptFocusNodeId = null;

         });
       },
    })),
    {
      name: 'forky-storage',
      partialize: (state) => ({
        nodes: mapToArray(state.nodes).map(serializeNode),
        edges: mapToArray(state.edges).map(serializeEdge),
        settings: state.settings,
        quickActions: state.quickActions,
        viewport: state.viewport,
        currentProjectId: state.currentProjectId,
        currentProjectName: state.currentProjectName,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as {
          nodes?: Array<SerializedNode | Node>;
          edges?: Array<SerializedEdge | Edge>;
          settings?: Settings;
          quickActions?: QuickAction[];
          viewport?: Viewport;
          currentProjectId?: string | null;
          currentProjectName?: string;
        };

        let mergedSettings = persisted?.settings || currentState.settings;
        if (mergedSettings.defaultModel === 'gpt-4o') {
          mergedSettings = { ...mergedSettings, defaultModel: 'glm-4.7' };
        }

        const hydratedNodes = persisted?.nodes
          ? arrayToMap(persisted.nodes.map(deserializeNode))
          : currentState.nodes;

        const hydratedEdges = persisted?.edges
          ? arrayToMap(persisted.edges.map(deserializeEdge))
          : currentState.edges;

        return {
          ...currentState,
          nodes: hydratedNodes,
          edges: hydratedEdges,
          settings: mergedSettings,
          quickActions: persisted?.quickActions || currentState.quickActions,
          viewport: persisted?.viewport || currentState.viewport,
          currentProjectId: persisted?.currentProjectId || currentState.currentProjectId,
          currentProjectName:
            persisted?.currentProjectName || currentState.currentProjectName,
        };
      },
    }
  )
);

export const useNodes = () => useStore((state) => state.nodes);
export const useEdges = () => useStore((state) => state.edges);
export const useNode = (id: string) => useStore((state) => state.nodes.get(id));
export const useSelectedNodeIds = () => useStore((state) => state.selectedNodeIds);
export const useSettings = () => useStore((state) => state.settings);
export const useQuickActions = () => useStore((state) => state.quickActions);
export const useUI = () => useStore((state) => state.ui);
export const useViewport = () => useStore((state) => state.viewport);
export const useBuildSession = () => useStore((state) => state.buildSession);

export const useBuildActions = () => {
  const startBuildSession = useStore((state) => state.startBuildSession);
  const startBuildFromNode = useStore((state) => state.startBuildFromNode);
  const startPlanScopeEdit = useStore((state) => state.startPlanScopeEdit);
  const applyBuildScopeToPlan = useStore((state) => state.applyBuildScopeToPlan);
  const endBuildSession = useStore((state) => state.endBuildSession);
  const setNodeMode = useStore((state) => state.setNodeMode);
  const setBuildDeliverable = useStore((state) => state.setBuildDeliverable);
  const setBuildScopeConfig = useStore((state) => state.setBuildScopeConfig);
  const recomputeBuildSuggestions = useStore((state) => state.recomputeBuildSuggestions);
  const toggleBuildInclude = useStore((state) => state.toggleBuildInclude);
  const toggleBuildExclude = useStore((state) => state.toggleBuildExclude);
  const toggleBuildPin = useStore((state) => state.toggleBuildPin);
  const includeBuildBranch = useStore((state) => state.includeBuildBranch);
  const excludeBuildBranch = useStore((state) => state.excludeBuildBranch);
  const pinBuildBranch = useStore((state) => state.pinBuildBranch);
  const unpinBuildBranch = useStore((state) => state.unpinBuildBranch);
  const resetBuildToSuggested = useStore((state) => state.resetBuildToSuggested);
  const generatePlanFromBuildSession = useStore((state) => state.generatePlanFromBuildSession);

  return useMemo(
    () => ({
      startBuildSession,
      startBuildFromNode,
      startPlanScopeEdit,
      applyBuildScopeToPlan,
      endBuildSession,
      setNodeMode,
      setBuildDeliverable,
      setBuildScopeConfig,
      recomputeBuildSuggestions,
      toggleBuildInclude,
      toggleBuildExclude,
      toggleBuildPin,
      includeBuildBranch,
      excludeBuildBranch,
      pinBuildBranch,
      unpinBuildBranch,
      resetBuildToSuggested,
      generatePlanFromBuildSession,
    }),
    [
      startBuildSession,
      startBuildFromNode,
      startPlanScopeEdit,
      applyBuildScopeToPlan,
      endBuildSession,
      setNodeMode,
      setBuildDeliverable,
      setBuildScopeConfig,
      recomputeBuildSuggestions,
      toggleBuildInclude,
      toggleBuildExclude,
      toggleBuildPin,
      includeBuildBranch,
      excludeBuildBranch,
      pinBuildBranch,
      unpinBuildBranch,
      resetBuildToSuggested,
      generatePlanFromBuildSession,
    ]
  );
};

export const usePlanActions = () => {
  const refreshPlanVersion = useStore((state) => state.refreshPlanVersion);
  const setActivePlanVersion = useStore((state) => state.setActivePlanVersion);
  const generateArtifactFromPlan = useStore((state) => state.generateArtifactFromPlan);
  const generateTodoFromPlan = useStore((state) => state.generateTodoFromPlan);

  return useMemo(
    () => ({
      refreshPlanVersion,
      setActivePlanVersion,
      generateArtifactFromPlan,
      generateTodoFromPlan,
    }),
    [refreshPlanVersion, setActivePlanVersion, generateArtifactFromPlan, generateTodoFromPlan]
  );
};

export const useNodeActions = () => {
  const addNode = useStore((state) => state.addNode);
  const addNodeWithPrompt = useStore((state) => state.addNodeWithPrompt);
  const updateNode = useStore((state) => state.updateNode);
  const deleteNode = useStore((state) => state.deleteNode);
  const setNodeStatus = useStore((state) => state.setNodeStatus);
  const updateNodePrompt = useStore((state) => state.updateNodePrompt);
  const updateNodeResponse = useStore((state) => state.updateNodeResponse);
  const updateNodeSummary = useStore((state) => state.updateNodeSummary);

  return useMemo(
    () => ({
      addNode,
      addNodeWithPrompt,
      updateNode,
      deleteNode,
      setNodeStatus,
      updateNodePrompt,
      updateNodeResponse,
      updateNodeSummary,
    }),
    [
      addNode,
      addNodeWithPrompt,
      updateNode,
      deleteNode,
      setNodeStatus,
      updateNodePrompt,
      updateNodeResponse,
      updateNodeSummary,
    ]
  );
};

export const useEdgeActions = () => {
  const addEdge = useStore((state) => state.addEdge);
  const deleteEdge = useStore((state) => state.deleteEdge);

  return useMemo(
    () => ({
      addEdge,
      deleteEdge,
    }),
    [addEdge, deleteEdge]
  );
};

export const useSelectionActions = () => {
  const selectNode = useStore((state) => state.selectNode);
  const deselectNode = useStore((state) => state.deselectNode);
  const clearSelection = useStore((state) => state.clearSelection);
  const toggleNodeSelection = useStore((state) => state.toggleNodeSelection);
  const setSelectedNodeIds = useStore((state) => state.setSelectedNodeIds);

  return useMemo(
    () => ({
      selectNode,
      deselectNode,
      clearSelection,
      toggleNodeSelection,
      setSelectedNodeIds,
    }),
    [selectNode, deselectNode, clearSelection, toggleNodeSelection, setSelectedNodeIds]
  );
};
