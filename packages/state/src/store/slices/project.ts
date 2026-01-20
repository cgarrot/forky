import type { StoreSlice, StoreState } from '../types';

export const createProjectSlice: StoreSlice<
  Pick<
    StoreState,
    'currentProjectId' | 'currentProjectName' | 'setCurrentProjectId' | 'setCurrentProjectName'
  >
> = (set) => ({
  currentProjectId: null,
  currentProjectName: 'Untitled project',

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
});
