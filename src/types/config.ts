export interface Config {
  spawn_command: string;
  notify_command?: string;
  default_model: string;
  stuck_timeout_hours?: number;
  session_check_command?: string;
  step_timeout_minutes?: number; // Fix 1: timeout brutal par step
}

export type ProviderType = 'claude' | 'openclaw' | 'opencode';
