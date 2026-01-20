import type { Edge, Node } from '@forky/shared-core';

export type SerializedNode = Omit<Node, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type SerializedEdge = Omit<Edge, 'createdAt'> & {
  createdAt: string;
};

export const mapToArray = <T>(map: Map<string, T>): T[] => Array.from(map.values());

export const arrayToMap = <T extends { id: string }>(array: T[]): Map<string, T> =>
  new Map(array.map((item) => [item.id, item]));

export const serializeNode = (node: Node): SerializedNode => ({
  ...node,
  createdAt: node.createdAt.toISOString(),
  updatedAt: node.updatedAt.toISOString(),
});

export const serializeEdge = (edge: Edge): SerializedEdge => ({
  ...edge,
  createdAt: edge.createdAt.toISOString(),
});

export const deserializeNode = (node: SerializedNode | Node): Node => ({
  ...node,
  createdAt: node.createdAt instanceof Date ? node.createdAt : new Date(node.createdAt),
  updatedAt: node.updatedAt instanceof Date ? node.updatedAt : new Date(node.updatedAt),
});

export const deserializeEdge = (edge: SerializedEdge | Edge): Edge => ({
  ...edge,
  createdAt: edge.createdAt instanceof Date ? edge.createdAt : new Date(edge.createdAt),
});
