import type { StoreSlice, StoreState } from '../types';
import { arrayToMap } from '../serialization';

export const createLifecycleSlice: StoreSlice<
  Pick<StoreState, 'loadProject' | 'clearAll'>
> = (set) => ({
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
});
