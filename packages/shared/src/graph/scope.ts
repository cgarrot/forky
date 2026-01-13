import type { Node } from '../types/node.types';

export type ScopeDirection = 'parents' | 'children' | 'both';

export type ScopeEntry = {
  nodeId: string;
  depth: number;
  parentDepth?: number;
  childDepth?: number;
  branches: string[];
};

export type ComputeScopeOptions = {
  direction?: ScopeDirection;
  maxDepth?: number;
};

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function mergeBranches(target: string[], incoming: string[]) {
  for (const branch of incoming) {
    pushUnique(target, branch);
  }
}

function getOrInit(map: Map<string, ScopeEntry>, nodeId: string): ScopeEntry {
  const existing = map.get(nodeId);
  if (existing) {
    return existing;
  }
  const created: ScopeEntry = { nodeId, depth: Number.POSITIVE_INFINITY, branches: [] };
  map.set(nodeId, created);
  return created;
}

function traverse(
  params: {
    rootId: string;
    nodes: Map<string, Node>;
    getNext: (node: Node) => string[];
    setDepth: (entry: ScopeEntry, depth: number) => void;
  },
  options: { maxDepth: number }
): Map<string, ScopeEntry> {
  const { rootId, nodes, getNext, setDepth } = params;

  const entries = new Map<string, ScopeEntry>();
  const root = nodes.get(rootId);
  if (!root) {
    return entries;
  }

  const firstHops = getNext(root);

  type QueueItem = { nodeId: string; depth: number; branchId: string };
  const queue: QueueItem[] = [];

  for (const hopId of firstHops) {
    if (!hopId) continue;
    queue.push({ nodeId: hopId, depth: 1, branchId: hopId });
  }

  const visitedAtDepth = new Map<string, number>();

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;

    if (current.depth > options.maxDepth) {
      continue;
    }

    const node = nodes.get(current.nodeId);
    if (!node) continue;

    const prevDepth = visitedAtDepth.get(current.nodeId);
    if (!(typeof prevDepth === 'number' && prevDepth < current.depth)) {
      visitedAtDepth.set(current.nodeId, current.depth);
    }

    const entry = getOrInit(entries, current.nodeId);
    if (current.depth < entry.depth) {
      entry.depth = current.depth;
    }
    pushUnique(entry.branches, current.branchId);
    setDepth(entry, current.depth);

    const nextIds = getNext(node);
    for (const nextId of nextIds) {
      if (!nextId) continue;
      queue.push({ nodeId: nextId, depth: current.depth + 1, branchId: current.branchId });
    }
  }

  return entries;
}

export function computeScope(rootId: string, nodes: Map<string, Node>, options: ComputeScopeOptions = {}): Map<string, ScopeEntry> {
  const maxDepth = typeof options.maxDepth === 'number' && options.maxDepth >= 0 ? options.maxDepth : 3;
  const direction = options.direction ?? 'both';

  const combined = new Map<string, ScopeEntry>();

  const rootEntry: ScopeEntry = { nodeId: rootId, depth: 0, branches: [] };
  combined.set(rootId, rootEntry);

  if (direction === 'parents' || direction === 'both') {
    const parents = traverse(
      {
        rootId,
        nodes,
        getNext: (node) => node.parentIds,
        setDepth: (entry, depth) => {
          if (typeof entry.parentDepth !== 'number' || depth < entry.parentDepth) {
            entry.parentDepth = depth;
          }
        },
      },
      { maxDepth }
    );

    for (const [nodeId, entry] of parents.entries()) {
      const target = getOrInit(combined, nodeId);
      if (entry.depth < target.depth) {
        target.depth = entry.depth;
      }
      if (typeof entry.parentDepth === 'number') {
        target.parentDepth = typeof target.parentDepth === 'number' ? Math.min(target.parentDepth, entry.parentDepth) : entry.parentDepth;
      }
      mergeBranches(target.branches, entry.branches);
    }
  }

  if (direction === 'children' || direction === 'both') {
    const children = traverse(
      {
        rootId,
        nodes,
        getNext: (node) => node.childrenIds,
        setDepth: (entry, depth) => {
          if (typeof entry.childDepth !== 'number' || depth < entry.childDepth) {
            entry.childDepth = depth;
          }
        },
      },
      { maxDepth }
    );

    for (const [nodeId, entry] of children.entries()) {
      const target = getOrInit(combined, nodeId);
      if (entry.depth < target.depth) {
        target.depth = entry.depth;
      }
      if (typeof entry.childDepth === 'number') {
        target.childDepth = typeof target.childDepth === 'number' ? Math.min(target.childDepth, entry.childDepth) : entry.childDepth;
      }
      mergeBranches(target.branches, entry.branches);
    }
  }

  const root = combined.get(rootId);
  if (root) {
    root.depth = 0;
  }

  return combined;
}

export function getBranchCount(entry: ScopeEntry): number {
  return entry.branches.length;
}
