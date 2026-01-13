export type AgentCapability = 
  | 'code_generation' 
  | 'analysis' 
  | 'summarization' 
  | 'planning' 
  | 'research' 
  | 'creative_writing';

export interface AgentType {
  id: string;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  model: string;
  maxTokens: number;
  temperature: number;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentTask {
  id: string;
  agentId: string;
  type: string;
  input: any;
  status: TaskStatus;
  result?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AgentTaskCreate {
  agentId: string;
  type: string;
  input: any;
}

export interface AgentConfig {
  agentTypes: AgentType[];
  defaultAgentId: string;
}
