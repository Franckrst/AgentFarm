import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import {
  ensureDir,
  readJson,
  writeJson,
  fileExists,
  readdirSync,
  statSync,
  getRunsDir,
  getWorkflowsDir,
} from '../utils/index.js';
import { WorkflowNotFoundError, StepNotFoundError } from '../utils/errors.js';
import type { Run, Step, Workflow } from '../types/index.js';

// Re-export for convenience
export { getRunsDir };

export function generateRunId(): string {
  return randomBytes(4).toString('hex');
}

export function nowTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export interface InitializeRunOptions {
  task: string;
  repoPath: string;
  workflowName: string;
}

export async function initializeRun(
  options: InitializeRunOptions
): Promise<Run> {
  const { task, repoPath, workflowName } = options;

  // Validate workflow exists
  const workflowPath = join(getWorkflowsDir(), `${workflowName}.json`);
  if (!fileExists(workflowPath)) {
    throw new WorkflowNotFoundError(workflowName);
  }

  const workflow = readJson<Workflow>(workflowPath);

  // Generate run ID and create directory
  const runId = generateRunId();
  const runsDir = getRunsDir();
  const runDir = join(runsDir, runId);

  ensureDir(runDir);
  ensureDir(join(runDir, 'steps'));
  ensureDir(join(runDir, 'logs'));

  // Create run.json
  const run: Run = {
    id: runId,
    task,
    repo: repoPath,
    workflow: workflowName,
    status: 'running',
    created_at: nowTimestamp(),
  };

  writeJson(join(runDir, 'run.json'), run);

  // Create step files from workflow
  workflow.steps.forEach((stepDef, index) => {
    const padded = String(index + 1).padStart(2, '0');
    const stepFile = join(runDir, 'steps', `${padded}-${stepDef.id}.json`);

    const step: Step = {
      id: stepDef.id,
      type: stepDef.type,
      status: 'pending',
    };

    if (stepDef.role) {
      step.role = stepDef.role;
    }

    writeJson(stepFile, step);
  });

  return run;
}

export function getRunDir(runId: string): string {
  return join(getRunsDir(), runId);
}

export function loadRun(runId: string): Run {
  const runPath = join(getRunDir(runId), 'run.json');
  return readJson<Run>(runPath);
}

export function saveRun(run: Run): void {
  const runPath = join(getRunDir(run.id), 'run.json');
  writeJson(runPath, run);
}

/**
 * Find step file by step ID in a run directory
 */
export function findStepFile(runDir: string, stepId: string): string {
  const stepsDir = join(runDir, 'steps');
  const files = readdirSync(stepsDir);

  for (const file of files) {
    if (file.endsWith(`-${stepId}.json`)) {
      return join(stepsDir, file);
    }
  }

  throw new StepNotFoundError(stepId);
}

/**
 * Get all runs with their metadata
 */
export function getAllRuns(): Run[] {
  const runsDir = getRunsDir();
  if (!fileExists(runsDir)) {
    return [];
  }

  const runs: Run[] = [];
  const entries = readdirSync(runsDir);

  for (const entry of entries) {
    const runJsonPath = join(runsDir, entry, 'run.json');
    if (fileExists(runJsonPath)) {
      runs.push(readJson<Run>(runJsonPath));
    }
  }

  return runs;
}

export function findMostRecentRunId(): string | null {
  const runsDir = getRunsDir();
  if (!fileExists(runsDir)) {
    return null;
  }

  const entries = readdirSync(runsDir);
  let mostRecent: { id: string; mtime: number } | null = null;

  for (const entry of entries) {
    const runJsonPath = join(runsDir, entry, 'run.json');
    if (fileExists(runJsonPath)) {
      const stats = statSync(runJsonPath);
      if (!mostRecent || stats.mtimeMs > mostRecent.mtime) {
        mostRecent = { id: entry, mtime: stats.mtimeMs };
      }
    }
  }

  return mostRecent?.id ?? null;
}
