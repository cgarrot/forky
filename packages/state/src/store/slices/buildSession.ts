import {
  computeHeuristicScore,
  computeScope,
  generateEdgeId,
  generateNodeId,
  isPinned,
  readOrchestrationMetadata,
  writeOrchestrationMetadata,
} from '@forky/shared-core';
import type { Node } from '@forky/shared-core';
import type { BuildScopeDirection, BuildScopeNode, StoreSlice, StoreState } from '../types';

export function computeBuildScopeSnapshot(params: {
  rootNodeId: string;
  nodes: Map<string, Node>;
  direction: BuildScopeDirection;
  maxDepth: number;
}): {
  scopeNodes: Map<string, BuildScopeNode>;
  suggestedIncludedNodeIds: Set<string>;
  suggestedExcludedNodeIds: Set<string>;
  pinnedNodeIds: Set<string>;
} {
  const scopeEntries = computeScope(params.rootNodeId, params.nodes, {
    direction: params.direction,
    maxDepth: params.maxDepth,
  });

  const scopeNodes = new Map<string, BuildScopeNode>();
  const suggestedIncludedNodeIds = new Set<string>();
  const suggestedExcludedNodeIds = new Set<string>();
  const pinnedNodeIds = new Set<string>();

  for (const [nodeId, entry] of scopeEntries.entries()) {
    const node = params.nodes.get(nodeId);
    if (!node) continue;

    const pinned = isPinned(node.metadata);
    if (pinned) {
      pinnedNodeIds.add(nodeId);
    }

    const scored = computeHeuristicScore(node, entry);

    scopeNodes.set(nodeId, {
      nodeId,
      depth: entry.depth,
      branches: entry.branches,
      score: scored.score,
      tier: scored.tier,
      reasons: scored.reasons,
    });

    const includeByDefault = pinned || nodeId === params.rootNodeId || scored.tier !== 3;
    if (includeByDefault) {
      suggestedIncludedNodeIds.add(nodeId);
    } else {
      suggestedExcludedNodeIds.add(nodeId);
    }
  }

  return {
    scopeNodes,
    suggestedIncludedNodeIds,
    suggestedExcludedNodeIds,
    pinnedNodeIds,
  };
}

export const createBuildSessionSlice: StoreSlice<
  Pick<
    StoreState,
    | 'buildSession'
    | 'startBuildSession'
    | 'startBuildFromNode'
    | 'startPlanScopeEdit'
    | 'applyBuildScopeToPlan'
    | 'endBuildSession'
    | 'setNodeMode'
    | 'setBuildDeliverable'
    | 'setBuildScopeConfig'
    | 'recomputeBuildSuggestions'
    | 'toggleBuildInclude'
    | 'toggleBuildExclude'
    | 'toggleBuildPin'
    | 'includeBuildBranch'
    | 'excludeBuildBranch'
    | 'pinBuildBranch'
    | 'unpinBuildBranch'
    | 'resetBuildToSuggested'
    | 'generatePlanFromBuildSession'
    | 'generateArtifactFromPlan'
    | 'generateTodoFromPlan'
    | 'refreshPlanVersion'
    | 'setActivePlanVersion'
  >
> = (set) => ({
  buildSession: null,

  startBuildSession: (rootNodeId) => {
    set((state) => {
      const root = state.nodes.get(rootNodeId);
      if (!root) return;

      const direction: BuildScopeDirection = 'both';
      const maxDepth = 3;

      const snapshot = computeBuildScopeSnapshot({
        rootNodeId,
        nodes: state.nodes,
        direction,
        maxDepth,
      });

      state.buildSession = {
        rootNodeId,
        deliverable: '',
        direction,
        maxDepth,
        scopeNodes: snapshot.scopeNodes,
        includedNodeIds: new Set(snapshot.suggestedIncludedNodeIds),
        excludedNodeIds: new Set(snapshot.suggestedExcludedNodeIds),
        pinnedNodeIds: new Set(snapshot.pinnedNodeIds),
        suggestedIncludedNodeIds: new Set(snapshot.suggestedIncludedNodeIds),
        suggestedExcludedNodeIds: new Set(snapshot.suggestedExcludedNodeIds),
        frozenSuggestions: true,
        impactGlobalDetected: false,
        impactedBranchIds: new Set(),
      };
    });
  },

  startBuildFromNode: (rootNodeId) => {
    set((state) => {
      const root = state.nodes.get(rootNodeId);
      if (!root) return;

      root.metadata = writeOrchestrationMetadata(root.metadata, {
        mode: 'build',
        modeSource: 'manual',
      });
      root.updatedAt = new Date();

      const direction: BuildScopeDirection = 'both';
      const maxDepth = 3;

      const snapshot = computeBuildScopeSnapshot({
        rootNodeId,
        nodes: state.nodes,
        direction,
        maxDepth,
      });

      state.buildSession = {
        rootNodeId,
        deliverable: '',
        direction,
        maxDepth,
        scopeNodes: snapshot.scopeNodes,
        includedNodeIds: new Set(snapshot.suggestedIncludedNodeIds),
        excludedNodeIds: new Set(snapshot.suggestedExcludedNodeIds),
        pinnedNodeIds: new Set(snapshot.pinnedNodeIds),
        suggestedIncludedNodeIds: new Set(snapshot.suggestedIncludedNodeIds),
        suggestedExcludedNodeIds: new Set(snapshot.suggestedExcludedNodeIds),
        frozenSuggestions: true,
        impactGlobalDetected: false,
        impactedBranchIds: new Set(),
      };
    });
  },

  startPlanScopeEdit: (planNodeId) => {
    set((state) => {
      const planNode = state.nodes.get(planNodeId);
      if (!planNode) return;

      const orchestration = readOrchestrationMetadata(planNode.metadata);
      const buildRootNodeId = orchestration.plan?.buildRootNodeId ?? planNodeId;

      const direction: BuildScopeDirection = 'both';
      const maxDepth = 3;

      const snapshot = computeBuildScopeSnapshot({
        rootNodeId: buildRootNodeId,
        nodes: state.nodes,
        direction,
        maxDepth,
      });

      const includedFromPlan = new Set<string>(planNode.parentIds);
      includedFromPlan.add(buildRootNodeId);

      const excludedFromPlan = new Set<string>();
      for (const nodeId of snapshot.scopeNodes.keys()) {
        if (!includedFromPlan.has(nodeId)) {
          excludedFromPlan.add(nodeId);
        }
      }

      state.buildSession = {
        rootNodeId: buildRootNodeId,
        deliverable: orchestration.plan?.deliverable ?? '',
        direction,
        maxDepth,
        scopeNodes: snapshot.scopeNodes,
        includedNodeIds: includedFromPlan,
        excludedNodeIds: excludedFromPlan,
        pinnedNodeIds: new Set(snapshot.pinnedNodeIds),
        suggestedIncludedNodeIds: new Set(snapshot.suggestedIncludedNodeIds),
        suggestedExcludedNodeIds: new Set(snapshot.suggestedExcludedNodeIds),
        frozenSuggestions: true,
        impactGlobalDetected: false,
        impactedBranchIds: new Set(),
        targetPlanNodeId: planNodeId,
      };
    });
  },

  applyBuildScopeToPlan: () => {
    set((state) => {
      const session = state.buildSession;
      if (!session?.targetPlanNodeId) return;

      const planNode = state.nodes.get(session.targetPlanNodeId);
      if (!planNode) return;

      const nextParentIds = Array.from(session.includedNodeIds).filter(
        (id) => id !== planNode.id
      );

      for (const oldParentId of [...planNode.parentIds]) {
        planNode.parentIds = planNode.parentIds.filter((pid) => pid !== oldParentId);
        const parent = state.nodes.get(oldParentId);
        if (parent) {
          parent.childrenIds = parent.childrenIds.filter((cid) => cid !== planNode.id);
        }

        for (const [edgeId, edge] of state.edges.entries()) {
          if (edge.source === oldParentId && edge.target === planNode.id) {
            state.edges.delete(edgeId);
          }
        }
      }

      const now = new Date();
      for (const parentId of nextParentIds) {
        const parent = state.nodes.get(parentId);
        if (!parent) continue;

        const edgeId = generateEdgeId();
        state.edges.set(edgeId, {
          id: edgeId,
          source: parentId,
          target: planNode.id,
          createdAt: now,
        });

        if (!parent.childrenIds.includes(planNode.id)) {
          parent.childrenIds.push(planNode.id);
        }
        if (!planNode.parentIds.includes(parentId)) {
          planNode.parentIds.push(parentId);
        }
      }

      planNode.updatedAt = now;
      if (planNode.status !== 'loading') {
        planNode.status = 'stale';
      }

      const orch = readOrchestrationMetadata(planNode.metadata);
      if (orch.plan) {
        planNode.metadata = writeOrchestrationMetadata(planNode.metadata, {
          plan: { ...orch.plan, isStale: true },
        });
      }

      state.buildSession = null;
    });
  },

  setNodeMode: (nodeId, mode, source) => {
    set((state) => {
      const node = state.nodes.get(nodeId);
      if (!node) return;
      node.metadata = writeOrchestrationMetadata(node.metadata, {
        mode,
        modeSource: source,
      });
      node.updatedAt = new Date();
    });
  },

  endBuildSession: () => {
    set((state) => {
      state.buildSession = null;
    });
  },

  setBuildDeliverable: (deliverable) => {
    set((state) => {
      if (!state.buildSession) return;
      state.buildSession.deliverable = deliverable;
    });
  },

  setBuildScopeConfig: (config) => {
    set((state) => {
      if (!state.buildSession) return;
      if (config.direction) {
        state.buildSession.direction = config.direction;
      }
      if (typeof config.maxDepth === 'number' && config.maxDepth >= 0) {
        state.buildSession.maxDepth = config.maxDepth;
      }

      const snapshot = computeBuildScopeSnapshot({
        rootNodeId: state.buildSession.rootNodeId,
        nodes: state.nodes,
        direction: state.buildSession.direction,
        maxDepth: state.buildSession.maxDepth,
      });

      state.buildSession.scopeNodes = snapshot.scopeNodes;
      state.buildSession.suggestedIncludedNodeIds = snapshot.suggestedIncludedNodeIds;
      state.buildSession.suggestedExcludedNodeIds = snapshot.suggestedExcludedNodeIds;
      state.buildSession.pinnedNodeIds = snapshot.pinnedNodeIds;
      state.buildSession.includedNodeIds = new Set(snapshot.suggestedIncludedNodeIds);
      state.buildSession.excludedNodeIds = new Set(snapshot.suggestedExcludedNodeIds);
      state.buildSession.frozenSuggestions = true;
      state.buildSession.impactGlobalDetected = false;
      state.buildSession.impactedBranchIds = new Set();
    });
  },

  recomputeBuildSuggestions: (params) => {
    set((state) => {
      if (!state.buildSession) return;

      const branchId = params?.branchId ?? null;

      if (!branchId) {
        const snapshot = computeBuildScopeSnapshot({
          rootNodeId: state.buildSession.rootNodeId,
          nodes: state.nodes,
          direction: state.buildSession.direction,
          maxDepth: state.buildSession.maxDepth,
        });

        state.buildSession.scopeNodes = snapshot.scopeNodes;
        state.buildSession.suggestedIncludedNodeIds = snapshot.suggestedIncludedNodeIds;
        state.buildSession.suggestedExcludedNodeIds = snapshot.suggestedExcludedNodeIds;
        state.buildSession.pinnedNodeIds = snapshot.pinnedNodeIds;
        state.buildSession.frozenSuggestions = true;
        state.buildSession.impactGlobalDetected = false;
        state.buildSession.impactedBranchIds = new Set();
        return;
      }

      const nextScopeNodes = new Map(state.buildSession.scopeNodes);
      const nextSuggestedIncluded = new Set(state.buildSession.suggestedIncludedNodeIds);
      const nextSuggestedExcluded = new Set(state.buildSession.suggestedExcludedNodeIds);

      const snapshot = computeBuildScopeSnapshot({
        rootNodeId: state.buildSession.rootNodeId,
        nodes: state.nodes,
        direction: state.buildSession.direction,
        maxDepth: state.buildSession.maxDepth,
      });

      for (const [nodeId, scoped] of snapshot.scopeNodes.entries()) {
        if (!scoped.branches.includes(branchId)) continue;
        nextScopeNodes.set(nodeId, scoped);

        if (snapshot.suggestedIncludedNodeIds.has(nodeId)) {
          nextSuggestedIncluded.add(nodeId);
          nextSuggestedExcluded.delete(nodeId);
        } else if (snapshot.suggestedExcludedNodeIds.has(nodeId)) {
          nextSuggestedExcluded.add(nodeId);
          nextSuggestedIncluded.delete(nodeId);
        }
      }

      state.buildSession.scopeNodes = nextScopeNodes;
      state.buildSession.suggestedIncludedNodeIds = nextSuggestedIncluded;
      state.buildSession.suggestedExcludedNodeIds = nextSuggestedExcluded;
      state.buildSession.frozenSuggestions = true;
    });
  },

  toggleBuildInclude: (nodeId) => {
    set((state) => {
      if (!state.buildSession) return;
      state.buildSession.excludedNodeIds.delete(nodeId);
      if (state.buildSession.includedNodeIds.has(nodeId)) {
        state.buildSession.includedNodeIds.delete(nodeId);
        state.buildSession.excludedNodeIds.add(nodeId);
      } else {
        state.buildSession.includedNodeIds.add(nodeId);
      }
    });
  },

  toggleBuildExclude: (nodeId) => {
    set((state) => {
      if (!state.buildSession) return;
      state.buildSession.includedNodeIds.delete(nodeId);
      if (state.buildSession.excludedNodeIds.has(nodeId)) {
        state.buildSession.excludedNodeIds.delete(nodeId);
        state.buildSession.includedNodeIds.add(nodeId);
      } else {
        state.buildSession.excludedNodeIds.add(nodeId);
      }
    });
  },

  toggleBuildPin: (nodeId) => {
    set((state) => {
      const node = state.nodes.get(nodeId);
      if (!node) return;

      const pinned = isPinned(node.metadata);
      const nextPinned = !pinned;

      node.metadata = writeOrchestrationMetadata(node.metadata, { pinned: nextPinned });
      node.updatedAt = new Date();

      if (state.buildSession) {
        if (nextPinned) {
          state.buildSession.pinnedNodeIds.add(nodeId);
          state.buildSession.includedNodeIds.add(nodeId);
          state.buildSession.excludedNodeIds.delete(nodeId);
        } else {
          state.buildSession.pinnedNodeIds.delete(nodeId);
        }
      }
    });
  },

  includeBuildBranch: (branchId) => {
    set((state) => {
      const session = state.buildSession;
      if (!session) return;

      for (const [nodeId, scoped] of session.scopeNodes.entries()) {
        if (!scoped.branches.includes(branchId)) continue;
        session.includedNodeIds.add(nodeId);
        session.excludedNodeIds.delete(nodeId);
      }
    });
  },

  excludeBuildBranch: (branchId) => {
    set((state) => {
      const session = state.buildSession;
      if (!session) return;

      for (const [nodeId, scoped] of session.scopeNodes.entries()) {
        if (!scoped.branches.includes(branchId)) continue;
        if (session.pinnedNodeIds.has(nodeId)) continue;
        session.excludedNodeIds.add(nodeId);
        session.includedNodeIds.delete(nodeId);
      }
    });
  },

  pinBuildBranch: (branchId) => {
    set((state) => {
      const session = state.buildSession;
      if (!session) return;

      for (const [nodeId, scoped] of session.scopeNodes.entries()) {
        if (!scoped.branches.includes(branchId)) continue;

        const node = state.nodes.get(nodeId);
        if (!node) continue;

        node.metadata = writeOrchestrationMetadata(node.metadata, { pinned: true });
        node.updatedAt = new Date();

        session.pinnedNodeIds.add(nodeId);
        session.includedNodeIds.add(nodeId);
        session.excludedNodeIds.delete(nodeId);
      }
    });
  },

  unpinBuildBranch: (branchId) => {
    set((state) => {
      const session = state.buildSession;
      if (!session) return;

      for (const [nodeId, scoped] of session.scopeNodes.entries()) {
        if (!scoped.branches.includes(branchId)) continue;

        const node = state.nodes.get(nodeId);
        if (!node) continue;

        node.metadata = writeOrchestrationMetadata(node.metadata, { pinned: false });
        node.updatedAt = new Date();

        session.pinnedNodeIds.delete(nodeId);
      }
    });
  },

  resetBuildToSuggested: () => {
    set((state) => {
      if (!state.buildSession) return;
      state.buildSession.includedNodeIds = new Set(
        state.buildSession.suggestedIncludedNodeIds
      );
      state.buildSession.excludedNodeIds = new Set(
        state.buildSession.suggestedExcludedNodeIds
      );
    });
  },

  generatePlanFromBuildSession: () => {
    const now = new Date();
    let createdPlanId: string | null = null;

    set((state) => {
      const session = state.buildSession;
      if (!session) return;
      if (!session.deliverable.trim()) return;

      const root = state.nodes.get(session.rootNodeId);
      if (!root) return;

      const included = Array.from(session.includedNodeIds);
      if (!included.includes(session.rootNodeId)) {
        included.push(session.rootNodeId);
      }

      included.sort();
      const scopeHash = included.join('|');

      const planNodeId = generateNodeId();
      createdPlanId = planNodeId;

      const version = 1;
      const createdAt = now.toISOString();

      const prompt = [
        `Objective: produce an excellent project plan for: ${session.deliverable}`,
        '',
        'Constraints:',
        '- Respond in structured Markdown (titles, lists, checklists).',
        '- Start with an ultra-concise summary.',
        '- Include: scope, milestones, risks, delivery plan, success criteria.',
        '- Use the context provided by parent nodes.',
      ].join('\n');

      const metadata = writeOrchestrationMetadata(undefined, {
        logicalRole: 'plan',
        mode: 'build',
        modeSource: 'manual',
        plan: {
          versions: [{ version, content: '', createdAt, scopeHash }],
          activeVersion: version,
          isStale: false,
          deliverable: session.deliverable,
          scopeHash,
          buildRootNodeId: session.rootNodeId,
        },
      });

      state.nodes.set(planNodeId, {
        id: planNodeId,
        prompt,
        response: '',
        status: 'idle',
        position: { x: root.position.x + 320, y: root.position.y + 40 },
        parentIds: [],
        childrenIds: [],
        createdAt: now,
        updatedAt: now,
        metadata,
      });

      const addEdgeInternal = (sourceId: string, targetId: string) => {
        const already = Array.from(state.edges.values()).some(
          (edge) => edge.source === sourceId && edge.target === targetId
        );
        if (already) return;

        const edgeId = generateEdgeId();
        state.edges.set(edgeId, {
          id: edgeId,
          source: sourceId,
          target: targetId,
          createdAt: now,
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
      };

      for (const nodeId of included) {
        addEdgeInternal(nodeId, planNodeId);
      }

      state.buildSession = null;
    });

    if (createdPlanId) {
      setTimeout(() => {
        const event = new CustomEvent('node:generate', { detail: { nodeId: createdPlanId } });
        window.dispatchEvent(event);
      }, 50);
    }

    return createdPlanId;
  },

  generateArtifactFromPlan: (planNodeId) => {
    const now = new Date();
    let createdArtifactId: string | null = null;

    set((state) => {
      const planNode = state.nodes.get(planNodeId);
      if (!planNode) return;

      const orchestration = readOrchestrationMetadata(planNode.metadata);
      const deliverable = orchestration.plan?.deliverable ?? 'Artifact';

      const parentIds = [...planNode.parentIds];
      parentIds.sort();
      const scopeHash = parentIds.join('|');

      const artifactNodeId = generateNodeId();
      createdArtifactId = artifactNodeId;

      const prompt = [
        'Objective: produce a deliverable (artifact) from the plan and context.',
        '',
        `Deliverable: ${deliverable}`,
        '',
        'Contraintes:',
        '- Respond in structured and directly usable Markdown.',
        '- Strictly follow the active plan.',
        '- Include necessary sections (e.g., intro, steps, checklists, appendices).',
      ].join('\n');

      const metadata = writeOrchestrationMetadata(undefined, {
        logicalRole: 'artifact',
        mode: 'build',
        modeSource: 'manual',
        artifact: { isFinal: false },
      });

      state.nodes.set(artifactNodeId, {
        id: artifactNodeId,
        prompt,
        response: '',
        status: 'idle',
        position: { x: planNode.position.x + 320, y: planNode.position.y + 60 },
        parentIds: [],
        childrenIds: [],
        createdAt: now,
        updatedAt: now,
        metadata,
      });

      const addEdgeInternal = (sourceId: string, targetId: string) => {
        const already = Array.from(state.edges.values()).some(
          (edge) => edge.source === sourceId && edge.target === targetId
        );
        if (already) return;

        const edgeId = generateEdgeId();
        state.edges.set(edgeId, {
          id: edgeId,
          source: sourceId,
          target: targetId,
          createdAt: now,
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
      };

      addEdgeInternal(planNodeId, artifactNodeId);

      for (const pid of parentIds) {
        addEdgeInternal(pid, artifactNodeId);
      }

      const created = state.nodes.get(artifactNodeId);
      if (created) {
        created.metadata = writeOrchestrationMetadata(created.metadata, {
          artifact: { isFinal: false },
          scoreExplanation: { reason: `Derived from plan scope: ${scopeHash.slice(0, 40)}` },
        });
      }
    });

    if (createdArtifactId) {
      setTimeout(() => {
        const event = new CustomEvent('node:generate', {
          detail: { nodeId: createdArtifactId },
        });
        window.dispatchEvent(event);
      }, 50);
    }

    return createdArtifactId;
  },

  generateTodoFromPlan: (planNodeId) => {
    const now = new Date();
    let createdTodoId: string | null = null;

    set((state) => {
      const planNode = state.nodes.get(planNodeId);
      if (!planNode) return;

      const orchestration = readOrchestrationMetadata(planNode.metadata);
      const deliverable = orchestration.plan?.deliverable ?? 'Todo';

      const todoNodeId = generateNodeId();
      createdTodoId = todoNodeId;

      const prompt = [
        'Objectif: transformer le plan en une liste de tâches actionnables (todo).',
        '',
        `Contexte: ${deliverable}`,
        '',
        'Contraintes:',
        '- Return a structured Markdown list (checklist) with 10-25 items.',
        '- Group by sections if necessary.',
        '- Each item must be actionable and concrete.',
      ].join('\n');

      const metadata = writeOrchestrationMetadata(undefined, {
        logicalRole: 'artifact',
        mode: 'build',
        modeSource: 'manual',
        todo: { items: [], derivedFromPlanNodeId: planNodeId },
      });

      state.nodes.set(todoNodeId, {
        id: todoNodeId,
        prompt,
        response: '',
        status: 'idle',
        position: { x: planNode.position.x + 320, y: planNode.position.y + 220 },
        parentIds: [],
        childrenIds: [],
        createdAt: now,
        updatedAt: now,
        metadata,
      });

      const addEdgeInternal = (sourceId: string, targetId: string) => {
        const already = Array.from(state.edges.values()).some(
          (edge) => edge.source === sourceId && edge.target === targetId
        );
        if (already) return;

        const edgeId = generateEdgeId();
        state.edges.set(edgeId, {
          id: edgeId,
          source: sourceId,
          target: targetId,
          createdAt: now,
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
      };

      addEdgeInternal(planNodeId, todoNodeId);
      for (const pid of planNode.parentIds) {
        addEdgeInternal(pid, todoNodeId);
      }
    });

    if (createdTodoId) {
      setTimeout(() => {
        const event = new CustomEvent('node:generate', {
          detail: { nodeId: createdTodoId },
        });
        window.dispatchEvent(event);
      }, 50);
    }

    return createdTodoId;
  },

  refreshPlanVersion: (planNodeId) => {
    const now = new Date();

    set((state) => {
      const node = state.nodes.get(planNodeId);
      if (!node) return;

      const orchestration = readOrchestrationMetadata(node.metadata);
      const plan = orchestration.plan;
      if (!plan || !Array.isArray(plan.versions)) return;

      const versions = plan.versions;
      const maxVersion = versions.reduce(
        (acc, v) => (typeof v.version === 'number' && v.version > acc ? v.version : acc),
        0
      );
      const nextVersion = maxVersion + 1;

      const parentIds = [...node.parentIds].sort();
      const scopeHash = parentIds.join('|');

      const deliverable = plan.deliverable ?? 'Plan';

      const prompt = [
        `Objective: refresh the project plan for: ${deliverable}`,
        '',
        'Constraints:',
        '- Respond in structured Markdown (titles, lists, checklists).',
        '- Update the plan taking into account context changes.',
        '- Use the context provided by parent nodes.',
      ].join('\n');

      const createdAt = now.toISOString();

      const nextPlan = {
        ...plan,
        versions: [...versions, { version: nextVersion, content: '', createdAt, scopeHash }],
        activeVersion: nextVersion,
        isStale: false,
        scopeHash,
      };

      node.prompt = prompt;
      node.response = '';
      node.status = 'idle';
      node.updatedAt = now;
      node.metadata = writeOrchestrationMetadata(node.metadata, {
        logicalRole: 'plan',
        plan: nextPlan,
      });
    });

    setTimeout(() => {
      const event = new CustomEvent('node:generate', { detail: { nodeId: planNodeId } });
      window.dispatchEvent(event);
    }, 50);
  },

  setActivePlanVersion: (planNodeId, version) => {
    set((state) => {
      const node = state.nodes.get(planNodeId);
      if (!node) return;

      const orchestration = readOrchestrationMetadata(node.metadata);
      const plan = orchestration.plan;
      if (!plan || !Array.isArray(plan.versions)) return;

      const selected = plan.versions.find((v) => v.version === version);
      if (!selected) return;

      const nextPlan = {
        ...plan,
        activeVersion: version,
      };

      node.response = selected.content;
      node.status = 'idle';
      node.updatedAt = new Date();
      node.metadata = writeOrchestrationMetadata(node.metadata, {
        logicalRole: 'plan',
        plan: nextPlan,
      });
    });
  },
});
