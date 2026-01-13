import type { NodeMetadata } from '../types/node.types';
import type {
  ActionNodeData,
  ChallengerIntensity,
  LogicalRole,
  OperationMode,
  OrchestrationMetadata,
  PlanNodeData,
  SourceNodeData,
  Tier,
  TodoNodeData,
} from '../types/orchestration.types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getCustomData(metadata?: NodeMetadata): Record<string, unknown> {
  if (!metadata?.customData || !isPlainObject(metadata.customData)) {
    return {};
  }
  return metadata.customData;
}

function getOrchestrationRaw(metadata?: NodeMetadata): unknown {
  const customData = getCustomData(metadata);
  return customData['orchestration'];
}

export function readOrchestrationMetadata(metadata?: NodeMetadata): OrchestrationMetadata {
  const raw = getOrchestrationRaw(metadata);
  return isPlainObject(raw) ? (raw as OrchestrationMetadata) : {};
}

export function writeOrchestrationMetadata(metadata: NodeMetadata | undefined, patch: Partial<OrchestrationMetadata>): NodeMetadata {
  const existingCustomData = getCustomData(metadata);
  const existingOrchestration = readOrchestrationMetadata(metadata);

  return {
    ...(metadata ?? {}),
    customData: {
      ...existingCustomData,
      orchestration: {
        ...existingOrchestration,
        ...patch,
      },
    },
  };
}

export function getLogicalRole(metadata?: NodeMetadata): LogicalRole {
  const orchestration = readOrchestrationMetadata(metadata);
  return orchestration.logicalRole ?? 'conversation';
}

export function getOperationMode(metadata?: NodeMetadata): OperationMode {
  const orchestration = readOrchestrationMetadata(metadata);
  return orchestration.mode ?? 'explore';
}

export function isPinned(metadata?: NodeMetadata): boolean {
  const orchestration = readOrchestrationMetadata(metadata);
  return Boolean(orchestration.pinned);
}

export function getTier(metadata?: NodeMetadata): Tier | null {
  const orchestration = readOrchestrationMetadata(metadata);
  return orchestration.tier ?? null;
}

export function getPlanNodeData(metadata?: NodeMetadata): PlanNodeData | null {
  const orchestration = readOrchestrationMetadata(metadata);
  return orchestration.plan ?? null;
}

export function getChallengerIntensity(metadata?: NodeMetadata): ChallengerIntensity {
  const orchestration = readOrchestrationMetadata(metadata);
  return orchestration.challenger?.intensity ?? 'medium';
}

export function getSourceNodeData(metadata?: NodeMetadata): SourceNodeData | null {
  const orchestration = readOrchestrationMetadata(metadata);
  return orchestration.source ?? null;
}

export function getTodoNodeData(metadata?: NodeMetadata): TodoNodeData | null {
  const orchestration = readOrchestrationMetadata(metadata);
  return orchestration.todo ?? null;
}

export function getActionNodeData(metadata?: NodeMetadata): ActionNodeData | null {
  const orchestration = readOrchestrationMetadata(metadata);
  return orchestration.action ?? null;
}
