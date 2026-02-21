export interface StepDefinition {
  id: string;
  type: 'script' | 'ai';
  script?: string;
  role?: string;
  loop?: boolean;
  model?: string;
}

export interface Workflow {
  name: string;
  steps: StepDefinition[];
}
