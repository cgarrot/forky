export interface VoiceCommand {
  id: string;
  command: string;
  parameters?: Record<string, any>;
  timestamp: Date;
}

export interface VoiceConfig {
  enabled: boolean;
  language: string;
  sensitivity: number;
}

export interface VoiceActionResult {
  success: boolean;
  action: string;
  error?: string;
}
