import { execa } from 'execa';
import { join } from 'node:path';
import {
  readJson,
  fileExists,
  readFile,
  writeFile,
  getAgentfarmDir,
  loadConfig,
  ensureDir,
  readdirSync,
} from '../utils/index.js';
import { spawnAgent } from '../utils/spawn.js';
import { info } from '../utils/log.js';
import { getRunsDir, getRunDir, findStepFile, nowTimestamp } from './run.js';
import type { Run, Step, Config } from '../types/index.js';

export async function unstickRun(runId: string, stepId: string): Promise<void> {
  const runDir = getRunDir(runId);
  const runJsonPath = join(runDir, 'run.json');

  if (!fileExists(runJsonPath)) {
    throw new Error(`Run ${runId} not found`);
  }

  const run = readJson<Run>(runJsonPath);
  const config = loadConfig();
  const agentfarmDir = getAgentfarmDir();

  // Find step file
  const stepFile = findStepFile(runDir, stepId);

  // Check if session is still active
  if (config.session_check_command) {
    const label = `agentfarm-${runId}-${stepId}`;
    const cmd = config.session_check_command.replace('{label}', label);
    try {
      await execa('sh', ['-c', cmd]);
      info(`${stepId} still active — skipping`);
      return;
    } catch {
      // Session not active, proceed
    }
  }

  const step = readJson<Step>(stepFile);
  const stuckHours = calculateStuckHours(step.started_at);

  // Build medic prompt
  const medicLabel = `agentfarm-medic-${runId}-${stepId}`;
  const promptFile = `/tmp/agentfarm-medic-${runId}-${stepId}.md`;

  buildMedicPrompt(agentfarmDir, runDir, run, step, stepFile, stuckHours, config, promptFile);

  info(`Medic → run=${runId} step=${stepId} (stuck ${stuckHours}h)`);

  if (process.env.AGENTFARM_DRY_RUN === '1') {
    info(`DRY RUN: ${promptFile}`);
    return;
  }

  ensureDir(join(runDir, 'logs'));

  const result = await spawnAgent({
    command: config.spawn_command,
    promptFile,
    workdir: run.worktree ?? run.repo,
    runDir,
    label: medicLabel,
    model: config.default_model,
    runId,
    agentfarmDir,
  });

  if (result.exitCode !== 0) {
    info(`medic FAILED (exit=${result.exitCode})`);
  } else {
    info(`medic done for ${stepId}`);
  }
}

export async function autoUnstick(): Promise<void> {
  const config = loadConfig();
  const timeoutSecs = (config.stuck_timeout_hours ?? 2) * 3600;
  const now = Math.floor(Date.now() / 1000);

  const runsDir = getRunsDir();
  if (!fileExists(runsDir)) {
    info('No runs found.');
    return;
  }

  const entries = readdirSync(runsDir);
  let found = 0;

  for (const entry of entries) {
    const runJsonPath = join(runsDir, entry, 'run.json');
    if (!fileExists(runJsonPath)) continue;

    const run = readJson<Run>(runJsonPath);
    if (run.status !== 'running') continue;

    const stepsDir = join(runsDir, entry, 'steps');
    if (!fileExists(stepsDir)) continue;

    const stepFiles = readdirSync(stepsDir);

    for (const stepFileName of stepFiles) {
      const stepFilePath = join(stepsDir, stepFileName);
      const step = readJson<Step>(stepFilePath);

      if (step.status !== 'running') continue;
      if (!step.started_at) continue;

      const elapsed = now - toEpoch(step.started_at);

      if (elapsed >= timeoutSecs) {
        const stepId = stepFileName.replace(/^\d+-/, '').replace(/\.json$/, '');
        await unstickRun(entry, stepId);
        found++;
      }
    }
  }

  if (found === 0) {
    info('No stuck steps.');
  } else {
    info(`Dispatched ${found} medic(s).`);
  }
}

function calculateStuckHours(startedAt?: string): number {
  if (!startedAt) return 0;
  const now = Math.floor(Date.now() / 1000);
  const started = toEpoch(startedAt);
  return Math.floor((now - started) / 3600);
}

function toEpoch(isoDate: string): number {
  return Math.floor(new Date(isoDate).getTime() / 1000);
}

function buildMedicPrompt(
  agentfarmDir: string,
  runDir: string,
  run: Run,
  step: Step,
  stepFile: string,
  stuckHours: number,
  config: Config,
  outputPath: string
): void {
  const templatePath = join(agentfarmDir, 'prompts', 'medic.md');
  let content = readFile(templatePath);

  // Load plan if exists
  let plan = '';
  const planPath = join(runDir, 'plan.json');
  if (fileExists(planPath)) {
    plan = readFile(planPath);
  }

  const timeoutHours = config.stuck_timeout_hours ?? 2;

  content = content
    .replace(/\{run_id\}/g, run.id)
    .replace(/\{step_id\}/g, step.id)
    .replace(/\{step_file\}/g, stepFile)
    .replace(/\{step_role\}/g, step.role ?? 'unknown')
    .replace(/\{stuck_hours\}/g, String(stuckHours))
    .replace(/\{timeout_hours\}/g, String(timeoutHours))
    .replace(/\{repo\}/g, run.worktree ?? run.repo)
    .replace(/\{task\}/g, run.task)
    .replace(/\{run_dir\}/g, runDir)
    .replace(/\{miniflow_dir\}/g, agentfarmDir)
    .replace(/\{step_json\}/g, JSON.stringify(step, null, 2))
    .replace(/\{plan\}/g, plan);

  writeFile(outputPath, content);
}
