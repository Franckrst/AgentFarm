export interface Step {
  id: string
  type: string
  role?: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled'
  started_at?: string
  finished_at?: string
  medic_action?: string
  medic_reason?: string
  retry_count?: number
  current_story?: string
  output?: string
  error?: string
}

export interface Story {
  id: string
  title: string
  status?: string
  acceptance_criteria?: string[]
  error?: string
  agent?: string
}

export interface Plan {
  stories: Story[]
}

export interface Run {
  id: string
  task: string
  workflow: string
  repo: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  created_at: string
  finished_at?: string
  steps: Step[]
  plan?: Plan | null
}

export interface WorkflowDef {
  name: string
  steps: { id: string; type: string; role?: string; loop?: boolean }[]
}

export interface ApiResponse {
  runs: Run[]
  workflows: Record<string, WorkflowDef>
}

export const STATUS_ORDER = ['running', 'pending', 'completed', 'failed', 'cancelled'] as const
export type RunStatus = Run['status']