export interface Config {
  spawn_command: string;
  notify_command?: string;
  default_model: string;
  stuck_timeout_hours?: number;
  session_check_command?: string;
}

export type ProviderType = 'claude' | 'openclaw' | 'opencode';
