export class AgentfarmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentfarmError';
  }
}

export class RunNotFoundError extends AgentfarmError {
  constructor(runId: string) {
    super(`Run not found: ${runId}`);
  }
}

export class WorkflowNotFoundError extends AgentfarmError {
  constructor(name: string) {
    super(`Workflow not found: ${name}`);
  }
}

export class ConfigNotFoundError extends AgentfarmError {
  constructor() {
    super('Configuration not found. Run "agentfarm init" to configure.');
  }
}

export class StepNotFoundError extends AgentfarmError {
  constructor(stepId: string) {
    super(`Step not found: ${stepId}`);
  }
}

export class AgentSpawnError extends AgentfarmError {
  constructor(step: string, exitCode: number) {
    super(`Agent failed at step ${step} with exit code ${exitCode}`);
  }
}

export class WorktreeError extends AgentfarmError {
  constructor(message: string) {
    super(message);
  }
}
