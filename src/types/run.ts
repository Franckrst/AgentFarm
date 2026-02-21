export type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
export type StoryStatus = 'pending' | 'in_progress' | 'done' | 'failed';

export interface Run {
  id: string;
  task: string;
  repo: string;
  workflow: string;
  status: RunStatus;
  worktree?: string;
  branch?: string;
  created_at: string;
  finished_at?: string;
}

export interface Step {
  id: string;
  type: 'script' | 'ai';
  status: StepStatus;
  role?: string;
  started_at?: string;
  finished_at?: string;
  error?: string;
  current_story?: string;
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  agent?: string;
  status: StoryStatus;
  error?: string;
}

export interface Plan {
  stories: Story[];
}
