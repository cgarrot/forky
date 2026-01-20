import type { StoreSlice, StoreState } from '../types';

export const createSelectionSlice: StoreSlice<
  Pick<
    StoreState,
    | 'selectedNodeIds'
    | 'selectNode'
    | 'deselectNode'
    | 'clearSelection'
    | 'toggleNodeSelection'
    | 'setSelectedNodeIds'
  >
> = (set) => ({
  selectedNodeIds: new Set(),

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
});
