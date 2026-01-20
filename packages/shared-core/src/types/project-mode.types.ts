export type PhaseStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  status: PhaseStatus;
  startAt?: Date;
  endAt?: Date;
}

export interface ProjectModeState {
  currentPhase: string;
  phases: ProjectPhase[];
  progress: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
}

export interface PhaseTransition {
  from: string;
  to: string;
  timestamp: Date;
  reason?: string;
}

export interface ProjectModeConfig {
  id: string;
  name: string;
  phases: Omit<ProjectPhase, 'status' | 'startAt' | 'endAt'>[];
}
