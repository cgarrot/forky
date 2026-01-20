import type { Node, NodeMap, EdgeMap } from '../types';

export interface UpdateCallback {
  (nodeId: string, node: Node): void;
}

export interface CycleInfo {
  hasCycle: boolean;
  cycle?: string[];
}

/**
 * Propagate changes to all dependent nodes in the graph
 * @param nodeId - The ID of the node that changed
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @param onUpdate - Callback function called for each updated node
 */
export function cascadeUpdate(
  nodeId: string,
  nodes: NodeMap,
  edges: EdgeMap,
  onUpdate: UpdateCallback
): void {
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    // Find all nodes that depend on this node (edges where source is currentId)
    const dependentIds = Object.values(edges)
      .filter((edge) => edge.source === currentId)
      .map((edge) => edge.target);

    for (const depId of dependentIds) {
      const node = nodes[depId];
      if (node) {
        // Mark node as stale since its parent changed
        const updatedNode = { ...node, status: 'stale' as const, updatedAt: new Date() };
        onUpdate(depId, updatedNode);
        queue.push(depId);
      }
    }
  }
}

/**
 * Detect cycles in the graph using DFS
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @returns Information about whether a cycle exists
 */
export function detectCycle(nodes: NodeMap, edges: EdgeMap): CycleInfo {
  const nodeIds = Object.keys(nodes);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const parentMap = new Map<string, string>();

  function dfs(currentId: string): string[] | null {
    visited.add(currentId);
    recursionStack.add(currentId);

    // Find all outgoing edges from current node
    const outgoingEdges = Object.values(edges).filter(
      (edge) => edge.source === currentId
    );

    for (const edge of outgoingEdges) {
      const neighborId = edge.target;

      if (!visited.has(neighborId)) {
        parentMap.set(neighborId, currentId);
        const cycle = dfs(neighborId);
        if (cycle) return cycle;
      } else if (recursionStack.has(neighborId)) {
        // Found a cycle, reconstruct it
        const cycle: string[] = [neighborId];
        let current = currentId;
        while (current !== neighborId) {
          cycle.unshift(current);
          current = parentMap.get(current)!;
        }
        cycle.unshift(neighborId); // Close the cycle
        return cycle;
      }
    }

    recursionStack.delete(currentId);
    return null;
  }

  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      const cycle = dfs(nodeId);
      if (cycle) {
        return { hasCycle: true, cycle };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Perform topological sort on the graph
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @returns Array of node IDs in topological order
 * @throws Error if graph contains a cycle
 */
export function topologicalSort(nodes: NodeMap, edges: EdgeMap): string[] {
  // Build adjacency list and in-degree count
  const adjacencyList: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  const nodeIds = Object.keys(nodes);

  // Initialize
  for (const nodeId of nodeIds) {
    adjacencyList[nodeId] = [];
    inDegree[nodeId] = 0;
  }

  // Build graph
  for (const edge of Object.values(edges)) {
    adjacencyList[edge.source].push(edge.target);
    inDegree[edge.target]++;
  }

  // Find nodes with no incoming edges
  const queue: string[] = nodeIds.filter((id) => inDegree[id] === 0);
  const result: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    result.push(currentId);

    // Decrease in-degree for all neighbors
    for (const neighborId of adjacencyList[currentId]) {
      inDegree[neighborId]--;
      if (inDegree[neighborId] === 0) {
        queue.push(neighborId);
      }
    }
  }

  // Check for cycle
  if (result.length !== nodeIds.length) {
    const cycleInfo = detectCycle(nodes, edges);
    throw new Error(`Graph contains a cycle: ${cycleInfo.cycle?.join(' -> ')}`);
  }

  return result;
}
