import type { QuickAction } from '@forky/shared-core';
import { generateId } from '@forky/shared-core';
import type { StoreSlice, StoreState } from '../types';

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
    instruction: 'Develop with more details and examples.',
    order: 1,
  },
  {
    id: 'qa-3',
    label: 'ELI5',
    instruction: "Explain like I'm 5 years old.",
    order: 2,
  },
];

export const createQuickActionsSlice: StoreSlice<
  Pick<
    StoreState,
    | 'quickActions'
    | 'addQuickAction'
    | 'updateQuickAction'
    | 'deleteQuickAction'
    | 'reorderQuickActions'
  >
> = (set) => ({
  quickActions: defaultQuickActions,

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
});
