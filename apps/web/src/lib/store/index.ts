import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { generateEdgeId, generateId, generateNodeId } from '@forky/shared';
import type {
  Edge,
  Node,
  NodeStatus,
  QuickAction,
  Settings,
  UIState,
  Viewport,
} from '@forky/shared';

enableMapSet();

const defaultQuickActions: QuickAction[] = [
  {
    id: 'qa-1',
    label: 'Concis',
    instruction: "Reformule de manière plus concise en gardant l'essentiel.",
    order: 0,
  },
  {
    id: 'qa-2',
    label: 'Détails',
    instruction: "Développe avec plus de détails et d'exemples.",
    order: 1,
  },
  {
    id: 'qa-3',
    label: 'ELI5',
    instruction: 'Explique comme à un enfant de 5 ans.',
    order: 2,
  },
];

interface StoreState {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  selectedNodeIds: Set<string>;
  settings: Settings;
  quickActions: QuickAction[];
  ui: UIState;
  viewport: Viewport;
  currentProjectId: string | null;
  currentProjectName: string;
  history: HistoryState;

  undo: () => void;
  redo: () => void;

  addNode: (position: { x: number; y: number }) => string;
  addNodeWithPrompt: (position: { x: number; y: number }, prompt: string) => string;
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
      viewport: { x: 0, y: 0, zoom: 1 },
      currentProjectId: null,
      currentProjectName: 'Projet sans titre',
      history: { past: [], future: [], lastKey: null, lastAt: 0 },

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
          if (node) {
            node.status = status;
            node.updatedAt = new Date();
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
         });
       },

        clearAll: () => {
         set((state) => {
           state.nodes.clear();
           state.edges.clear();
           state.selectedNodeIds.clear();
           state.currentProjectId = null;
           state.currentProjectName = 'Projet sans titre';
           state.history = { past: [], future: [], lastKey: null, lastAt: 0 };
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

export const useNodeActions = () =>
  useStore((state) => ({
    addNode: state.addNode,
    addNodeWithPrompt: state.addNodeWithPrompt,
    updateNode: state.updateNode,
    deleteNode: state.deleteNode,
    setNodeStatus: state.setNodeStatus,
    updateNodePrompt: state.updateNodePrompt,
    updateNodeResponse: state.updateNodeResponse,
    updateNodeSummary: state.updateNodeSummary,
  }));

export const useEdgeActions = () =>
  useStore((state) => ({
    addEdge: state.addEdge,
    deleteEdge: state.deleteEdge,
  }));

export const useSelectionActions = () =>
  useStore((state) => ({
    selectNode: state.selectNode,
    deselectNode: state.deselectNode,
    clearSelection: state.clearSelection,
    toggleNodeSelection: state.toggleNodeSelection,
    setSelectedNodeIds: state.setSelectedNodeIds,
  }));
