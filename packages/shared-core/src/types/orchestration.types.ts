export type LogicalRole = 'conversation' | 'source' | 'challenger' | 'plan' | 'artifact';

export type OperationMode = 'explore' | 'build';

export type Tier = 1 | 2 | 3;

export type ScoreExplanation = {
  heuristicScore?: number;
  adjustedScore?: number;
  delta?: number;
  reason?: string;
};

export type PlanVersion = {
  version: number;
  content: string;
  createdAt: string;
  scopeHash?: string;
};

export type PlanNodeData = {
  versions: PlanVersion[];
  activeVersion: number;
  isStale?: boolean;
  deliverable?: string;
  scopeHash?: string;
  buildRootNodeId?: string;
};

export type ChallengerIntensity = 'soft' | 'medium' | 'hard';

export type ChallengerNodeData = {
  intensity: ChallengerIntensity;
};

export type SourceKind = 'web' | 'file' | 'image' | 'codebase' | 'manual';

export type SourceProvenance = {
  kind: SourceKind;
  uri: string;
  title?: string;
  retrievedAt?: string;
  sha256?: string;
  mimeType?: string;
};

export type SourceExcerpt = {
  id: string;
  text: string;
  startLine?: number;
  endLine?: number;
};

export type SourceNodeData = {
  provenance: SourceProvenance;
  excerpts: SourceExcerpt[];
  summary?: string;
};

export type ArtifactNodeData = {
  isFinal?: boolean;
};

export type TodoItemStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export type TodoItem = {
  id: string;
  title: string;
  status: TodoItemStatus;
  notes?: string;
  children?: TodoItem[];
};

export type TodoNodeData = {
  items: TodoItem[];
  derivedFromPlanNodeId?: string;
};

export type ActionType = 'generate_node' | 'summarize_node' | 'codebase_search' | 'codebase_index';

export type AgentAssignment = {
  agentTypeId: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ExecutionRun = {
  id: string;
  status: ExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  resultNodeId?: string;
  error?: string;
};

export type ActionNodeData = {
  actionType: ActionType;
  params: Record<string, unknown>;
  assignment?: AgentAssignment;
  runs?: ExecutionRun[];
};

export type OrchestrationMetadata = {
  mode?: OperationMode;
  modeSource?: 'auto' | 'manual';
  logicalRole?: LogicalRole;
  pinned?: boolean;
  score?: number;
  tier?: Tier;
  scoreExplanation?: ScoreExplanation;
  plan?: PlanNodeData;
  challenger?: ChallengerNodeData;
  source?: SourceNodeData;
  artifact?: ArtifactNodeData;
  todo?: TodoNodeData;
  action?: ActionNodeData;
};
