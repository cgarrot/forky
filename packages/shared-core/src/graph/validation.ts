import type { Node, NodeMap, EdgeMap } from '../types';
import { MAX_EDGES_PER_NODE } from '../constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate the entire graph structure
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @returns Validation result with errors and warnings
 */
export function validateGraph(
  nodes: NodeMap,
  edges: EdgeMap
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodeIds = new Set(Object.keys(nodes));

  // Check for orphaned edges (edges pointing to non-existent nodes)
  for (const edge of Object.values(edges)) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
    }
  }

  // Check for self-loops
  for (const edge of Object.values(edges)) {
    if (edge.source === edge.target) {
      warnings.push(`Edge ${edge.id} is a self-loop on node ${edge.source}`);
    }
  }

  // Check for duplicate edges
  const edgePairs = new Set<string>();
  for (const edge of Object.values(edges)) {
    const pair = `${edge.source}->${edge.target}`;
    if (edgePairs.has(pair)) {
      warnings.push(`Duplicate edge detected: ${pair}`);
    }
    edgePairs.add(pair);
  }

  // Check for nodes with too many outgoing edges
  for (const nodeId of Object.keys(nodes)) {
    const outgoingEdges = Object.values(edges).filter((e) => e.source === nodeId);
    if (outgoingEdges.length > MAX_EDGES_PER_NODE) {
      warnings.push(
        `Node ${nodeId} has ${outgoingEdges.length} outgoing edges, exceeds limit of ${MAX_EDGES_PER_NODE}`
      );
    }
  }

  // Check for isolated nodes (no edges connected)
  for (const nodeId of nodeIds) {
    const hasIncoming = Object.values(edges).some((e) => e.target === nodeId);
    const hasOutgoing = Object.values(edges).some((e) => e.source === nodeId);
    if (!hasIncoming && !hasOutgoing && nodeIds.size > 1) {
      warnings.push(`Node ${nodeId} is isolated (no connections)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a specific node connection
 * @param sourceId - Source node ID
 * @param targetId - Target node ID
 * @param existingEdges - All existing edges
 * @returns Validation result
 */
export function validateNodeConnection(
  sourceId: string,
  targetId: string,
  existingEdges: EdgeMap
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for self-connection
  if (sourceId === targetId) {
    errors.push('Cannot connect a node to itself');
  }

  // Check for duplicate edge
  const duplicateEdge = Object.values(existingEdges).find(
    (e) => e.source === sourceId && e.target === targetId
  );
  if (duplicateEdge) {
    errors.push(`Edge from ${sourceId} to ${targetId} already exists`);
  }

  // Check for reverse edge (potential cycle)
  const reverseEdge = Object.values(existingEdges).find(
    (e) => e.source === targetId && e.target === sourceId
  );
  if (reverseEdge) {
    warnings.push('Creating reverse edge may create a cycle');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single node
 * @param node - The node to validate
 * @param nodes - All nodes in the graph (for parent validation)
 * @returns Validation result
 */
export function validateNode(node: Node, nodes: NodeMap): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!node.id || node.id.trim() === '') {
    errors.push('Node ID is required');
  }

  if (!node.prompt || node.prompt.trim() === '') {
    errors.push('Node prompt is required');
  }

  // Check if parents exist
  for (const parentId of node.parentIds) {
    if (!nodes[parentId]) {
      errors.push(`Parent node ${parentId} does not exist`);
    }
  }

  // Check position validity
  if (isNaN(node.position.x) || isNaN(node.position.y)) {
    errors.push('Node position must be valid numbers');
  }

  // Check for empty response with loading status
  if (node.status === 'loading' && node.response) {
    warnings.push('Node has response but status is loading');
  }

  // Check for error status without error info
  if (node.status === 'error' && node.response) {
    warnings.push('Node has status error but response is present');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if adding an edge would create a cycle
 * @param sourceId - Source node ID
 * @param targetId - Target node ID
 * @param edges - All existing edges
 * @returns True if adding the edge would create a cycle
 */
export function wouldCreateCycle(
  sourceId: string,
  targetId: string,
  edges: EdgeMap
): boolean {
  // Create a temporary set of edges including the new one
  const tempEdges = new Set(
    Object.values(edges).map((e) => `${e.source}->${e.target}`)
  );
  tempEdges.add(`${sourceId}->${targetId}`);

  // Build adjacency list
  const adjacency: Record<string, string[]> = {};
  const allNodes = new Set<string>();

  for (const edge of Object.values(edges)) {
    allNodes.add(edge.source);
    allNodes.add(edge.target);
    if (!adjacency[edge.source]) adjacency[edge.source] = [];
    adjacency[edge.source].push(edge.target);
  }

  // Add the new edge
  if (!adjacency[sourceId]) adjacency[sourceId] = [];
  adjacency[sourceId].push(targetId);

  // Check for cycle using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency[nodeId] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check from all nodes
  for (const nodeId of allNodes) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) return true;
    }
  }

  return false;
}
