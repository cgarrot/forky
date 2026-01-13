export type LLMModel = {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  supportsStreaming: boolean;
  costPer1KTokens: number;
};


export interface ILLMProvider {
  generate(
    prompt: string,
    modelId: string,
    options?: GenerationOptions
  ): Promise<GenerationResponse>;

  generateStream(
    prompt: string,
    modelId: string,
    options?: GenerationOptions
  ): AsyncGenerator<string, void, unknown>;

  getAvailableModels(): LLMModel[];
  isModelAvailable(modelId: string): boolean;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stopSequences?: string[];
  timeout?: number;
}

export interface GenerationResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  duration: number;
}

export interface IStorageProvider {
  upload(file: File, projectId: string): Promise<UploadResult>;
  uploadUrl(url: string, projectId: string): Promise<UploadResult>;
  download(key: string): Promise<DownloadResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
}

export interface UploadResult {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface DownloadResult {
  stream: any;
  mimeType: string;
  size: number;
}

export interface ICollaborationService {
  joinProject(projectId: string, userId: string): Promise<void>;
  leaveProject(projectId: string, userId: string): Promise<void>;
  broadcast(event: CollaborationBroadcastEvent): Promise<void>;
  subscribe(projectId: string, callback: EventHandler): Promise<UnsubscribeFn>;
  updatePresence(userId: string, cursor: CursorPosition): Promise<void>;
}

export interface CollaborationBroadcastEvent {
  type: string;
  projectId: string;
  data: any;
  timestamp: Date;
}

export interface CursorPosition {
  x: number;
  y: number;
  nodeId?: string;
}

export type EventHandler = (event: CollaborationBroadcastEvent) => void;
export type UnsubscribeFn = () => void;

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface IAuthProvider {
  authenticate(token: string): Promise<UserContext>;
  generateToken(user: UserContext): Promise<string>;
  refreshToken(token: string): Promise<string>;
  revokeToken(token: string): Promise<void>;
}

export interface UserContext {
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  roles: string[];
}
