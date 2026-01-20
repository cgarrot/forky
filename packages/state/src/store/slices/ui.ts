import type { StoreSlice, StoreState } from '../types';

export const createUISlice: StoreSlice<
  Pick<
    StoreState,
    | 'ui'
    | 'promptFocusNodeId'
    | 'toggleSidebar'
    | 'setActiveModal'
    | 'setActiveQuickActionId'
    | 'setFocusModeNodeId'
    | 'setPromptFocusNodeId'
  >
> = (set) => ({
  ui: {
    sidebarOpen: true,
    activeModal: null,
    activeQuickActionId: null,
    focusModeNodeId: null,
  },
  promptFocusNodeId: null,

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
});
