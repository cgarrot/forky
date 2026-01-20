import type { StoreSlice, StoreState } from '../types';

export const createSettingsSlice: StoreSlice<
  Pick<StoreState, 'settings' | 'updateSettings'>
> = (set) => ({
  settings: {
    systemPrompt: '',
    defaultModel: 'glm-4.7',
  },

  updateSettings: (updates) => {
    set((state) => {
      Object.assign(state.settings, updates);
    });
  },
});
