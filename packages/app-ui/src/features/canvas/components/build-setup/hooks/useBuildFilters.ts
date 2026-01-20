import { useMemo, useState } from 'react';
import { getLogicalRole } from '@forky/shared-core';
import type { Node } from '@forky/shared-core';
import type { BuildScopeNode, BuildSessionState } from '@forky/state';

export type BuildTab = 'included' | 'excluded';

export type RoleFilter =
  | 'all'
  | 'conversation'
  | 'source'
  | 'challenger'
  | 'plan'
  | 'artifact';

export type BuildNodeListItem = {
  node: Node;
  scope?: BuildScopeNode;
  isPinned: boolean;
};

const buildListItems = (params: {
  nodeIds: string[];
  nodes: Map<string, Node>;
  buildSession: BuildSessionState;
  pinnedNodeIds: Set<string>;
  pinnedOnly: boolean;
  staleOnly: boolean;
  roleFilter: RoleFilter;
  searchQuery: string;
}): BuildNodeListItem[] => {
  const query = params.searchQuery.trim().toLowerCase();

  return params.nodeIds
    .filter((nodeId) => {
      const node = params.nodes.get(nodeId);
      if (!node) return false;

      if (params.pinnedOnly && !params.pinnedNodeIds.has(nodeId)) return false;
      if (params.staleOnly && node.status !== 'stale') return false;

      if (params.roleFilter !== 'all') {
        const role = getLogicalRole(node.metadata);
        if (role !== params.roleFilter) return false;
      }

      if (!query) return true;

      return (
        node.prompt.toLowerCase().includes(query) ||
        (node.summary && node.summary.toLowerCase().includes(query))
      );
    })
    .map((nodeId) => ({
      node: params.nodes.get(nodeId)!,
      scope: params.buildSession.scopeNodes.get(nodeId),
      isPinned: params.pinnedNodeIds.has(nodeId),
    }))
    .sort((a, b) => {
      const aScore = a.scope?.score ?? 0;
      const bScore = b.scope?.score ?? 0;
      return bScore - aScore;
    });
};

export function useBuildFilters(
  buildSession: BuildSessionState | null,
  nodes: Map<string, Node>
) {
  const [activeTab, setActiveTab] = useState<BuildTab>('included');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [staleOnly, setStaleOnly] = useState(false);

  const rootNode = useMemo(
    () =>
      buildSession ? nodes.get(buildSession.rootNodeId) ?? null : null,
    [buildSession, nodes]
  );
  const includedNodeIds = useMemo(
    () => (buildSession ? Array.from(buildSession.includedNodeIds) : []),
    [buildSession]
  );
  const excludedNodeIds = useMemo(
    () => (buildSession ? Array.from(buildSession.excludedNodeIds) : []),
    [buildSession]
  );
  const pinnedNodeIds = useMemo(
    () => buildSession?.pinnedNodeIds ?? new Set<string>(),
    [buildSession]
  );

  const filteredIncluded = useMemo(() => {
    if (!buildSession) return [];
    return buildListItems({
      nodeIds: includedNodeIds,
      nodes,
      buildSession,
      pinnedNodeIds,
      pinnedOnly,
      staleOnly,
      roleFilter,
      searchQuery,
    });
  }, [
    buildSession,
    includedNodeIds,
    nodes,
    pinnedNodeIds,
    pinnedOnly,
    roleFilter,
    searchQuery,
    staleOnly,
  ]);

  const filteredExcluded = useMemo(() => {
    if (!buildSession) return [];
    return buildListItems({
      nodeIds: excludedNodeIds,
      nodes,
      buildSession,
      pinnedNodeIds,
      pinnedOnly,
      staleOnly,
      roleFilter,
      searchQuery,
    });
  }, [
    buildSession,
    excludedNodeIds,
    nodes,
    pinnedNodeIds,
    pinnedOnly,
    roleFilter,
    searchQuery,
    staleOnly,
  ]);

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    pinnedOnly,
    setPinnedOnly,
    staleOnly,
    setStaleOnly,
    rootNode,
    includedNodeIds,
    excludedNodeIds,
    pinnedNodeIds,
    filteredIncluded,
    filteredExcluded,
  };
}
