import type { Node, Edge, NodeMap, EdgeMap, Position } from '../types';
import { NODE_SPACING_X, NODE_SPACING_Y, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../constants';

export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

/**
 * Calculate optimal position for a new node based on its parents and siblings
 * @param node - The node to position
 * @param existingNodes - All existing nodes
 * @param edges - All edges
 * @returns Calculated position for the node
 */
export function calculateNodePosition(
  node: Node,
  existingNodes: NodeMap,
  edges: EdgeMap
): Position {
  // If node has no parents, position at origin
  if (node.parentIds.length === 0) {
    return { x: 0, y: 0 };
  }

  // Calculate position based on parents
  const parentNodes = node.parentIds
    .map((id) => existingNodes[id])
    .filter((n): n is Node => n !== undefined);

  if (parentNodes.length === 0) {
    return { x: 0, y: 0 };
  }

  // Calculate average position of parents
  const avgX = parentNodes.reduce((sum, n) => sum + n.position.x, 0) / parentNodes.length;
  const avgY = parentNodes.reduce((sum, n) => sum + n.position.y, 0) / parentNodes.length;

  // Find siblings (nodes that share at least one parent)
  const siblingEdges: Edge[] = [];
  for (const parentId of node.parentIds) {
    const edgesFromParent = Object.values(edges).filter(
      (e) => e.source === parentId && e.target !== node.id
    );
    siblingEdges.push(...edgesFromParent);
  }

  const siblingNodes = siblingEdges
    .map((e) => existingNodes[e.target])
    .filter((n): n is Node => n !== undefined);

  // Position below parents
  const baseX = avgX;
  const baseY = avgY + NODE_SPACING_Y;

  // Find a good horizontal position
  let newX = baseX;
  if (siblingNodes.length > 0) {
    // Position after the last sibling
    const rightmostSibling = siblingNodes.reduce((rightmost, current) =>
      current.position.x > rightmost.position.x ? current : rightmost
    );
    newX = rightmostSibling.position.x + NODE_SPACING_X;
  }

  return { x: newX, y: baseY };
}

/**
 * Perform automatic layout of the entire graph
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @returns Array of node positions
 */
export function autoLayout(
  nodes: NodeMap,
  edges: EdgeMap
): NodePosition[] {
  const positions: NodePosition[] = [];
  const nodeIds = Object.keys(nodes);
  const visited = new Set<string>();

  // Group nodes by depth (distance from root)
  const depthGroups: Map<number, string[]> = new Map();
  const nodeDepths: Map<string, number> = new Map();

  // Calculate depth for each node using BFS
  function calculateDepths(startNodeId: string): void {
    const queue: { nodeId: string; depth: number }[] = [
      { nodeId: startNodeId, depth: 0 },
    ];

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      nodeDepths.set(nodeId, depth);

      if (!depthGroups.has(depth)) {
        depthGroups.set(depth, []);
      }
      depthGroups.get(depth)!.push(nodeId);

      // Find children (edges where source is nodeId)
      const childEdges = Object.values(edges).filter((e) => e.source === nodeId);
      for (const edge of childEdges) {
        queue.push({ nodeId: edge.target, depth: depth + 1 });
      }
    }
  }

  // Find root nodes (nodes with no parents)
  const rootNodes = nodeIds.filter((id) => {
    const parentEdges = Object.values(edges).filter((e) => e.target === id);
    return parentEdges.length === 0;
  });

  // Calculate depths starting from each root
  for (const rootId of rootNodes) {
    if (!visited.has(rootId)) {
      calculateDepths(rootId);
    }
  }

  // Handle any remaining nodes (shouldn't happen in valid graph)
  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      calculateDepths(nodeId);
    }
  }

  // Assign positions based on depth and horizontal spacing
  const maxDepth = Math.max(...depthGroups.keys());
  for (let depth = 0; depth <= maxDepth; depth++) {
    const nodesAtDepth = depthGroups.get(depth) || [];
    nodesAtDepth.forEach((nodeId, index) => {
      const x = index * NODE_SPACING_X;
      const y = depth * NODE_SPACING_Y;
      positions.push({ id: nodeId, x, y });
    });
  }

  return positions;
}

/**
 * Check if a position collides with any existing node
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param existingPositions - Array of existing node positions
 * @param width - Width of the node to check
 * @param height - Height of the node to check
 * @returns True if collision detected
 */
export function checkCollision(
  x: number,
  y: number,
  existingPositions: NodePosition[],
  width: number = DEFAULT_NODE_WIDTH,
  height: number = DEFAULT_NODE_HEIGHT
): boolean {
  for (const pos of existingPositions) {
    const node = nodes[pos.id] as Node | undefined;
    const nodeWidth = node?.position ? width : width;
    const nodeHeight = node?.position ? height : height;

    // Simple AABB collision detection
    const horizontalOverlap =
      x < pos.x + nodeWidth && x + width > pos.x;
    const verticalOverlap =
      y < pos.y + nodeHeight && y + height > pos.y;

    if (horizontalOverlap && verticalOverlap) {
      return true;
    }
  }

  return false;
}

/**
 * Find a non-colliding position for a new node
 * @param startX - Starting X position
 * @param startY - Starting Y position
 * @param existingPositions - Array of existing node positions
 * @param width - Width of the node
 * @param height - Height of the node
 * @returns Non-colliding position
 */
export function findNonCollidingPosition(
  startX: number,
  startY: number,
  existingPositions: NodePosition[],
  width: number = DEFAULT_NODE_WIDTH,
  height: number = DEFAULT_NODE_HEIGHT
): Position {
  let x = startX;
  let y = startY;
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    if (!checkCollision(x, y, existingPositions, width, height)) {
      return { x, y };
    }

    // Move to next position in spiral pattern
    if (attempts % 4 === 0) {
      x += NODE_SPACING_X;
    } else if (attempts % 4 === 1) {
      y += NODE_SPACING_Y;
    } else if (attempts % 4 === 2) {
      x -= NODE_SPACING_X;
    } else {
      y -= NODE_SPACING_Y;
    }

    attempts++;
  }

  // If we couldn't find a non-colliding position, return a far position
  return {
    x: startX + existingPositions.length * NODE_SPACING_X,
    y: startY,
  };
}

// Helper function to access nodes in checkCollision
let nodes: NodeMap = {};

export function setNodesForCollisionCheck(nodeMap: NodeMap): void {
  nodes = nodeMap;
}
