import type { Node } from '../types/node.types';
import type { Tier } from '../types/orchestration.types';
import type { ScopeEntry } from './scope';
import { getLogicalRole, isPinned, readOrchestrationMetadata } from '../utils/orchestration.utils';

export type ScoreResult = {
  score: number;
  tier: Tier;
  reasons: string[];
};

function clampScore(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function assignTier(score: number): Tier {
  if (score >= 75) return 1;
  if (score >= 40) return 2;
  return 3;
}

function scoreProximity(depth: number): number {
  const base = 100 - depth * 20;
  return clampScore(base);
}

function scoreDirection(entry: ScopeEntry): number {
  if (typeof entry.parentDepth === 'number' && typeof entry.childDepth === 'number') {
    return 8;
  }
  if (typeof entry.parentDepth === 'number') {
    return 8;
  }
  if (typeof entry.childDepth === 'number') {
    return 4;
  }
  return 0;
}

function scoreRole(node: Node): number {
  const role = getLogicalRole(node.metadata);
  if (role === 'source') return 20;
  if (role === 'plan' || role === 'artifact') return 15;
  if (role === 'challenger') return 5;
  return 10;
}

function scoreRecency(node: Node, now: number): number {
  const updatedAt = node.updatedAt instanceof Date ? node.updatedAt.getTime() : now;
  const deltaMs = Math.max(0, now - updatedAt);

  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (deltaMs <= hour) return 5;
  if (deltaMs <= day) return 2;
  return 0;
}

export function computeHeuristicScore(node: Node, entry: ScopeEntry, now: Date = new Date()): ScoreResult {
  if (isPinned(node.metadata)) {
    return {
      score: 100,
      tier: 1,
      reasons: ['Pinned'],
    };
  }

  const proximity = scoreProximity(entry.depth);
  const direction = scoreDirection(entry);
  const role = scoreRole(node);
  const recency = scoreRecency(node, now.getTime());

  const weighted = Math.round(proximity * 0.6 + direction + role + recency);
  const score = clampScore(weighted);

  const reasons: string[] = [];
  reasons.push(`Distance ${entry.depth}`);

  if (typeof entry.parentDepth === 'number' && typeof entry.childDepth === 'number') {
    reasons.push('Multi-direction (parent + child)');
  } else if (typeof entry.parentDepth === 'number') {
    reasons.push('Ancestor context');
  } else if (typeof entry.childDepth === 'number') {
    reasons.push('Descendant branch');
  }

  reasons.push(`Role ${getLogicalRole(node.metadata)}`);

  if (recency > 0) {
    reasons.push('Recent');
  }

  const orchestration = readOrchestrationMetadata(node.metadata);
  if (orchestration.scoreExplanation?.reason) {
    reasons.push(orchestration.scoreExplanation.reason);
  }

  return {
    score,
    tier: assignTier(score),
    reasons,
  };
}

export function applyScoreAdjustment(params: {
  score: number;
  delta: number;
  reason: string;
}): { score: number; delta: number; reason: string } {
  const next = clampScore(Math.round(params.score + params.delta));
  return { score: next, delta: next - params.score, reason: params.reason };
}
