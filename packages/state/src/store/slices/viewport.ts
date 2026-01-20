import type { StoreSlice, StoreState } from '../types';

export const createViewportSlice: StoreSlice<
  Pick<StoreState, 'viewport' | 'setViewport'>
> = (set) => ({
  viewport: { x: 0, y: 0, zoom: 1 },

  setViewport: (viewport) => {
    set((state) => {
      state.viewport = viewport;
    });
  },
});
