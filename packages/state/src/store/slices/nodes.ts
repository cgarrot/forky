import type { Node } from '@forky/shared-core';
import {
  generateNodeId,
  readOrchestrationMetadata,
  writeOrchestrationMetadata,
} from '@forky/shared-core';
import type { StoreSlice, StoreState } from '../types';
import { detectModeFromPrompt } from '../utils';
import { createSnapshot, shouldPushHistory } from './history';

export const createNodesSlice: StoreSlice<
  Pick<
    StoreState,
    | 'nodes'
    | 'addNode'
    | 'addNodeWithPrompt'
    | 'createChildNode'
    | 'updateNode'
    | 'deleteNode'
    | 'setNodes'
    | 'setNodeStatus'
    | 'updateNodePrompt'
    | 'updateNodeResponse'
    | 'updateNodeSummary'
  >
> = (set, get) => ({
  nodes: new Map(),

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

    const childId = get().addNodeWithPrompt(
      { x: parent.position.x + 60, y: parent.position.y + 320 },
      prompt
    );
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
        node.metadata = writeOrchestrationMetadata(node.metadata, {
          mode,
          modeSource: 'auto',
        });
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

            const childOrch = readOrchestrationMetadata(child.metadata);
            if (childOrch.logicalRole === 'plan' && childOrch.plan) {
              child.metadata = writeOrchestrationMetadata(child.metadata, {
                plan: { ...childOrch.plan, isStale: true },
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
});
