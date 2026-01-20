import type { Node, NodeMap, EdgeMap } from '../types';

export interface AncestorNode extends Node {
  depth: number;
}

export interface SiblingNode extends Node {
  relationship: 'immediate' | 'shared-parent';
}

export interface BuildContextOptions {
  maxDepth?: number;
  includeSiblings?: boolean;
  maxAncestors?: number;
}

/**
 * Build LLM context for a node by traversing its ancestors
 * @param nodeId - The ID of the node to build context for
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @param options - Options for context building
 * @returns Array of ancestor nodes with their depth
 */
export function buildContext(
  nodeId: string,
  nodes: NodeMap,
  edges: EdgeMap,
  options: BuildContextOptions = {}
): AncestorNode[] {
  const {
    maxDepth = 5,
    includeSiblings = true,
    maxAncestors = 10,
  } = options;

  const ancestors: AncestorNode[] = [];
  const visited = new Set<string>();
  const queue: { nodeId: string; depth: number }[] = [{ nodeId, depth: 0 }];

  while (queue.length > 0 && ancestors.length < maxAncestors) {
    const { nodeId: currentId, depth } = queue.shift()!;

    if (visited.has(currentId) || depth > maxDepth) {
      continue;
    }

    visited.add(currentId);
    const node = nodes[currentId];

    if (!node || node.id === nodeId) {
      // Don't include the target node itself
    } else {
      ancestors.push({ ...node, depth });
    }

    // Find parent nodes (edges where target is currentId)
    const parentEdges = Object.values(edges).filter(
      (edge) => edge.target === currentId
    );

    for (const edge of parentEdges) {
      if (includeSiblings) {
        // Find siblings (nodes with same parent)
        const siblingEdges = Object.values(edges).filter(
          (e) => e.source === edge.source && e.target !== currentId
        );

        for (const siblingEdge of siblingEdges) {
          const sibling = nodes[siblingEdge.target];
          if (sibling && !visited.has(sibling.id)) {
            queue.push({ nodeId: sibling.id, depth: depth + 1 });
          }
        }
      }

      // Add parent to queue
      queue.push({ nodeId: edge.source, depth: depth + 1 });
    }
  }

  // Sort by depth
  return ancestors.sort((a, b) => a.depth - b.depth);
}

/**
 * Build a prompt string from a node and its context
 * @param node - The target node
 * @param ancestors - Ancestor nodes to include in context
 * @param siblings - Sibling nodes to include in context
 * @returns Formatted prompt string with context
 */
export function buildPromptContext(
  node: Node,
  ancestors: AncestorNode[],
  siblings?: SiblingNode[]
): string {
  const parts: string[] = [];

  // Add ancestors context
  if (ancestors.length > 0) {
    parts.push('## Context from previous nodes:\n');

    for (let i = ancestors.length - 1; i >= 0; i--) {
      const ancestor = ancestors[i];
      parts.push(`### [${ancestor.depth} steps back] ${ancestor.prompt}`);
      if (ancestor.response) {
        parts.push(`Response: ${ancestor.response}\n`);
      }
      if (ancestor.summary) {
        parts.push(`Summary: ${ancestor.summary}\n`);
      }
    }
  }

  // Add siblings context
  if (siblings && siblings.length > 0) {
    parts.push('\n## Related nodes:\n');
    for (const sibling of siblings) {
      parts.push(`- ${sibling.prompt}`);
      if (sibling.summary) {
        parts.push(`  (${sibling.summary})`);
      }
    }
  }

  // Add current node prompt
  parts.push('\n## Current request:\n');
  parts.push(node.prompt);

  return parts.join('\n');
}

/**
 * Get immediate siblings of a node
 * @param nodeId - The ID of the node
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @returns Array of sibling nodes
 */
export function getSiblings(
  nodeId: string,
  nodes: NodeMap,
  edges: EdgeMap
): SiblingNode[] {
  const siblings: SiblingNode[] = [];

  // Find parent edges
  const parentEdges = Object.values(edges).filter(
    (edge) => edge.target === nodeId
  );

  for (const parentEdge of parentEdges) {
    // Find all other children of this parent
    const siblingEdges = Object.values(edges).filter(
      (edge) => edge.source === parentEdge.source && edge.target !== nodeId
    );

    for (const siblingEdge of siblingEdges) {
      const sibling = nodes[siblingEdge.target];
      if (sibling) {
        siblings.push({
          ...sibling,
          relationship: 'immediate',
        });
      }
    }
  }

  return siblings;
}
