import { generateEdgeId } from '@forky/shared-core';
import type { StoreSlice, StoreState } from '../types';
import { isCriticalPrompt } from '../utils';
import { createSnapshot, shouldPushHistory } from './history';
import { computeBuildScopeSnapshot } from './buildSession';

export const createEdgesSlice: StoreSlice<
  Pick<StoreState, 'edges' | 'addEdge' | 'deleteEdge'>
> = (set, get) => ({
  edges: new Map(),

  addEdge: (sourceId, targetId) => {
    const state = get();
    const existingEdge = Array.from(state.edges.values()).find(
      (edge) => edge.source === sourceId && edge.target === targetId
    );
    if (existingEdge) return null;

    const snapshot = createSnapshot(get());
    const id = generateEdgeId();
    set((state) => {
      if (shouldPushHistory(state.history, 'addEdge')) {
        state.history.past.push(snapshot);
        if (state.history.past.length > 50) {
          state.history.past.shift();
        }
        state.history.future = [];
      }

      state.edges.set(id, {
        id,
        source: sourceId,
        target: targetId,
        createdAt: new Date(),
      });

      const sourceNode = state.nodes.get(sourceId);
      const targetNode = state.nodes.get(targetId);
      if (sourceNode && targetNode) {
        if (!sourceNode.childrenIds.includes(targetId)) {
          sourceNode.childrenIds.push(targetId);
        }
        if (!targetNode.parentIds.includes(sourceId)) {
          targetNode.parentIds.push(sourceId);
        }
      }

      const session = state.buildSession;
      if (session && sourceNode && targetNode) {
        const rootId = session.rootNodeId;
        const branchIds =
          sourceId === rootId
            ? [targetId]
            : session.scopeNodes.get(sourceId)?.branches ?? [];

        if (branchIds.length > 0) {
          const snapshotNow = computeBuildScopeSnapshot({
            rootNodeId: rootId,
            nodes: state.nodes,
            direction: session.direction,
            maxDepth: session.maxDepth,
          });

          for (const branchId of branchIds) {
            for (const [nodeId, scoped] of snapshotNow.scopeNodes.entries()) {
              if (!scoped.branches.includes(branchId)) continue;

              session.scopeNodes.set(nodeId, scoped);

              if (snapshotNow.suggestedIncludedNodeIds.has(nodeId)) {
                session.suggestedIncludedNodeIds.add(nodeId);
                session.suggestedExcludedNodeIds.delete(nodeId);
              } else if (snapshotNow.suggestedExcludedNodeIds.has(nodeId)) {
                session.suggestedExcludedNodeIds.add(nodeId);
                session.suggestedIncludedNodeIds.delete(nodeId);
              }

              if (!session.includedNodeIds.has(nodeId) && !session.excludedNodeIds.has(nodeId)) {
                if (snapshotNow.suggestedIncludedNodeIds.has(nodeId)) {
                  session.includedNodeIds.add(nodeId);
                } else {
                  session.excludedNodeIds.add(nodeId);
                }
              }
            }
          }

          session.pinnedNodeIds = snapshotNow.pinnedNodeIds;
          session.frozenSuggestions = true;

          const pivotDepth = session.scopeNodes.get(sourceId)?.depth;
          const closeToPivot =
            sourceId === rootId || (typeof pivotDepth === 'number' && pivotDepth <= 1);
          const multiParent = targetNode.parentIds.length > 1;
          const critical = isCriticalPrompt(targetNode.prompt);

          if (closeToPivot || multiParent || critical) {
            session.impactGlobalDetected = true;
            for (const branchId of branchIds) {
              session.impactedBranchIds.add(branchId);
            }
          }
        }
      }
    });
    return id;
  },

  deleteEdge: (id) => {
    const snapshot = createSnapshot(get());
    set((state) => {
      if (shouldPushHistory(state.history, 'deleteEdge')) {
        state.history.past.push(snapshot);
        if (state.history.past.length > 50) {
          state.history.past.shift();
        }
        state.history.future = [];
      }

      const edge = state.edges.get(id);
      if (!edge) return;

      const sourceNode = state.nodes.get(edge.source);
      const targetNode = state.nodes.get(edge.target);
      if (sourceNode) {
        sourceNode.childrenIds = sourceNode.childrenIds.filter(
          (cid) => cid !== edge.target
        );
      }
      if (targetNode) {
        targetNode.parentIds = targetNode.parentIds.filter(
          (pid) => pid !== edge.source
        );
      }

      state.edges.delete(id);
    });
  },
});
