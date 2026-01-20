import type { HistorySnapshot, HistoryState, StoreSlice, StoreState } from '../types';

const deepClone = <T>(value: T): T => {
  const cloneFn = (globalThis as unknown as { structuredClone?: (input: unknown) => unknown })
    .structuredClone;
  if (typeof cloneFn === 'function') {
    return cloneFn(value) as T;
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

export const createSnapshot = (
  state: Pick<StoreState, 'nodes' | 'edges' | 'selectedNodeIds' | 'currentProjectName'>
): HistorySnapshot => ({
  nodes: new Map(
    Array.from(state.nodes.entries()).map(([id, node]) => [id, deepClone(node)])
  ),
  edges: new Map(
    Array.from(state.edges.entries()).map(([id, edge]) => [id, deepClone(edge)])
  ),
  selectedNodeIds: new Set(Array.from(state.selectedNodeIds.values())),
  currentProjectName: state.currentProjectName,
});

export const applySnapshot = (state: StoreState, snapshot: HistorySnapshot) => {
  state.nodes = new Map(
    Array.from(snapshot.nodes.entries()).map(([id, node]) => [id, deepClone(node)])
  );
  state.edges = new Map(
    Array.from(snapshot.edges.entries()).map(([id, edge]) => [id, deepClone(edge)])
  );
  state.selectedNodeIds = new Set(Array.from(snapshot.selectedNodeIds.values()));
  state.currentProjectName = snapshot.currentProjectName;
};

export const shouldPushHistory = (history: HistoryState, key: string) => {
  const now = Date.now();
  const shouldSkip = history.lastKey === key && now - history.lastAt < 750;
  history.lastKey = key;
  history.lastAt = now;
  return !shouldSkip;
};

export const createHistorySlice: StoreSlice<
  Pick<StoreState, 'history' | 'undo' | 'redo'>
> = (set, get) => ({
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
});
