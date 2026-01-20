import { useMemo } from 'react';
import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { QuickAction, Settings, Viewport } from '@forky/shared-core';
import type { Edge, Node } from '@forky/shared-core';
import type { StoreState } from './types';
import {
  arrayToMap,
  deserializeEdge,
  deserializeNode,
  mapToArray,
  serializeEdge,
  serializeNode,
} from './serialization';
import type { SerializedEdge, SerializedNode } from './serialization';
import { createBuildSessionSlice } from './slices/buildSession';
import { createEdgesSlice } from './slices/edges';
import { createHistorySlice } from './slices/history';
import { createLifecycleSlice } from './slices/lifecycle';
import { createNodesSlice } from './slices/nodes';
import { createProjectSlice } from './slices/project';
import { createQuickActionsSlice } from './slices/quickActions';
import { createSelectionSlice } from './slices/selection';
import { createSettingsSlice } from './slices/settings';
import { createUISlice } from './slices/ui';
import { createViewportSlice } from './slices/viewport';

enableMapSet();

export const useStore = create<StoreState>()(
  persist(
    immer((set, get, api) => ({
      ...createNodesSlice(set, get, api),
      ...createEdgesSlice(set, get, api),
      ...createSelectionSlice(set, get, api),
      ...createSettingsSlice(set, get, api),
      ...createQuickActionsSlice(set, get, api),
      ...createUISlice(set, get, api),
      ...createViewportSlice(set, get, api),
      ...createProjectSlice(set, get, api),
      ...createHistorySlice(set, get, api),
      ...createBuildSessionSlice(set, get, api),
      ...createLifecycleSlice(set, get, api),
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
          currentProjectName: persisted?.currentProjectName || currentState.currentProjectName,
        };
      },
    }
  )
);

export { mapToArray } from './serialization';
export * from './types';

export const useNodes = () => useStore((state) => state.nodes);
export const useEdges = () => useStore((state) => state.edges);
export const useNode = (id: string) => useStore((state) => state.nodes.get(id));
export const useSelectedNodeIds = () => useStore((state) => state.selectedNodeIds);
export const useSettings = () => useStore((state) => state.settings);
export const useQuickActions = () => useStore((state) => state.quickActions);
export const useUI = () => useStore((state) => state.ui);
export const useViewport = () => useStore((state) => state.viewport);
export const useBuildSession = () => useStore((state) => state.buildSession);

export const useBuildActions = () => {
  const startBuildSession = useStore((state) => state.startBuildSession);
  const startBuildFromNode = useStore((state) => state.startBuildFromNode);
  const startPlanScopeEdit = useStore((state) => state.startPlanScopeEdit);
  const applyBuildScopeToPlan = useStore((state) => state.applyBuildScopeToPlan);
  const endBuildSession = useStore((state) => state.endBuildSession);
  const setNodeMode = useStore((state) => state.setNodeMode);
  const setBuildDeliverable = useStore((state) => state.setBuildDeliverable);
  const setBuildScopeConfig = useStore((state) => state.setBuildScopeConfig);
  const recomputeBuildSuggestions = useStore((state) => state.recomputeBuildSuggestions);
  const toggleBuildInclude = useStore((state) => state.toggleBuildInclude);
  const toggleBuildExclude = useStore((state) => state.toggleBuildExclude);
  const toggleBuildPin = useStore((state) => state.toggleBuildPin);
  const includeBuildBranch = useStore((state) => state.includeBuildBranch);
  const excludeBuildBranch = useStore((state) => state.excludeBuildBranch);
  const pinBuildBranch = useStore((state) => state.pinBuildBranch);
  const unpinBuildBranch = useStore((state) => state.unpinBuildBranch);
  const resetBuildToSuggested = useStore((state) => state.resetBuildToSuggested);
  const generatePlanFromBuildSession = useStore((state) => state.generatePlanFromBuildSession);

  return useMemo(
    () => ({
      startBuildSession,
      startBuildFromNode,
      startPlanScopeEdit,
      applyBuildScopeToPlan,
      endBuildSession,
      setNodeMode,
      setBuildDeliverable,
      setBuildScopeConfig,
      recomputeBuildSuggestions,
      toggleBuildInclude,
      toggleBuildExclude,
      toggleBuildPin,
      includeBuildBranch,
      excludeBuildBranch,
      pinBuildBranch,
      unpinBuildBranch,
      resetBuildToSuggested,
      generatePlanFromBuildSession,
    }),
    [
      startBuildSession,
      startBuildFromNode,
      startPlanScopeEdit,
      applyBuildScopeToPlan,
      endBuildSession,
      setNodeMode,
      setBuildDeliverable,
      setBuildScopeConfig,
      recomputeBuildSuggestions,
      toggleBuildInclude,
      toggleBuildExclude,
      toggleBuildPin,
      includeBuildBranch,
      excludeBuildBranch,
      pinBuildBranch,
      unpinBuildBranch,
      resetBuildToSuggested,
      generatePlanFromBuildSession,
    ]
  );
};

export const usePlanActions = () => {
  const refreshPlanVersion = useStore((state) => state.refreshPlanVersion);
  const setActivePlanVersion = useStore((state) => state.setActivePlanVersion);
  const generateArtifactFromPlan = useStore((state) => state.generateArtifactFromPlan);
  const generateTodoFromPlan = useStore((state) => state.generateTodoFromPlan);

  return useMemo(
    () => ({
      refreshPlanVersion,
      setActivePlanVersion,
      generateArtifactFromPlan,
      generateTodoFromPlan,
    }),
    [refreshPlanVersion, setActivePlanVersion, generateArtifactFromPlan, generateTodoFromPlan]
  );
};

export const useNodeActions = () => {
  const addNode = useStore((state) => state.addNode);
  const addNodeWithPrompt = useStore((state) => state.addNodeWithPrompt);
  const updateNode = useStore((state) => state.updateNode);
  const deleteNode = useStore((state) => state.deleteNode);
  const setNodeStatus = useStore((state) => state.setNodeStatus);
  const updateNodePrompt = useStore((state) => state.updateNodePrompt);
  const updateNodeResponse = useStore((state) => state.updateNodeResponse);
  const updateNodeSummary = useStore((state) => state.updateNodeSummary);

  return useMemo(
    () => ({
      addNode,
      addNodeWithPrompt,
      updateNode,
      deleteNode,
      setNodeStatus,
      updateNodePrompt,
      updateNodeResponse,
      updateNodeSummary,
    }),
    [
      addNode,
      addNodeWithPrompt,
      updateNode,
      deleteNode,
      setNodeStatus,
      updateNodePrompt,
      updateNodeResponse,
      updateNodeSummary,
    ]
  );
};

export const useEdgeActions = () => {
  const addEdge = useStore((state) => state.addEdge);
  const deleteEdge = useStore((state) => state.deleteEdge);

  return useMemo(
    () => ({
      addEdge,
      deleteEdge,
    }),
    [addEdge, deleteEdge]
  );
};

export const useSelectionActions = () => {
  const selectNode = useStore((state) => state.selectNode);
  const deselectNode = useStore((state) => state.deselectNode);
  const clearSelection = useStore((state) => state.clearSelection);
  const toggleNodeSelection = useStore((state) => state.toggleNodeSelection);
  const setSelectedNodeIds = useStore((state) => state.setSelectedNodeIds);

  return useMemo(
    () => ({
      selectNode,
      deselectNode,
      clearSelection,
      toggleNodeSelection,
      setSelectedNodeIds,
    }),
    [selectNode, deselectNode, clearSelection, toggleNodeSelection, setSelectedNodeIds]
  );
};
