import { execa } from 'execa';
import { join } from 'node:path';
import {
  readJson,
  writeJson,
  fileExists,
  readFile,
  writeFile,
  getAgentfarmDir,
  loadConfig,
} from '../utils/index.js';
import { spawnAgent } from '../utils/spawn.js';
import { advance as log, setLogContext } from '../utils/log.js';
import { AgentSpawnError } from '../utils/errors.js';
import { getRunDir, findStepFile, nowTimestamp } from './run.js';
import type { Run, Step, Plan, Workflow, StepDefinition, Config } from '../types/index.js';

/** Shared context for step execution */
interface StepContext {
  runId: string;
  runDir: string;
  run: Run;
  config: Config;
  workdir: string;
  agentfarmDir: string;
}

export async function advanceRun(runId: string): Promise<void> {
  const runDir = getRunDir(runId);
  const runJsonPath = join(runDir, 'run.json');
  const run = readJson<Run>(runJsonPath);

  const agentfarmDir = getAgentfarmDir();
  const config = loadConfig();

  const workflowPath = join(agentfarmDir, 'workflows', `${run.workflow}.json`);
  const workflow = readJson<Workflow>(workflowPath);

  const workdir = run.worktree ?? run.repo;

  const ctx: StepContext = { runId, runDir, run, config, workdir, agentfarmDir };

  // Fix 3: Initialiser le contexte de logs centralisé
  setLogContext(runDir);
  
  log(`run ${runId} (workflow=${run.workflow})`);

  for (const stepDef of workflow.steps) {
    // Check if cancelled
    const currentRun = readJson<Run>(runJsonPath);
    if (currentRun.status === 'cancelled') {
      log('run cancelled, aborting');
      return;
    }

    const stepFile = findStepFile(runDir, stepDef.id);
    const step = readJson<Step>(stepFile);

    if (step.status === 'done') continue;
    if (step.status === 'failed') {
      log(`step ${stepDef.id} — failed, aborting`);
      process.exit(1);
    }
    if (step.status === 'cancelled') {
      log(`step ${stepDef.id} — cancelled, aborting`);
      return;
    }

    const label = `agentfarm-${runId}-${stepDef.id}`;
    log(`step ${stepDef.id} (${stepDef.type})`);

    if (stepDef.type === 'script') {
      await executeScriptStep(ctx, stepDef, stepFile);
    } else {
      await executeAiStep(ctx, stepDef, stepFile, label);
    }
  }

  // All done
  const finalRun = readJson<Run>(runJsonPath);
  finalRun.status = 'completed';
  finalRun.finished_at = nowTimestamp();
  writeJson(runJsonPath, finalRun);

  log(`run ${runId} completed: ${run.task}`);

  // Notify if configured
  if (config.notify_command) {
    const message = `run ${runId} completed: ${run.task}`;
    const cmd = config.notify_command.replace('{message}', message);
    try {
      await execa('sh', ['-c', cmd]);
    } catch {
      // Ignore notification errors
    }
  }
}

async function executeScriptStep(
  ctx: StepContext,
  stepDef: StepDefinition,
  stepFile: string
): Promise<void> {
  const logFile = join(ctx.runDir, 'logs', `${stepDef.id}.log`);

  try {
    const scriptPath = join(ctx.agentfarmDir, 'bin', stepDef.script!);
    const result = await execa('bash', [scriptPath, ctx.runId], {
      cwd: ctx.agentfarmDir,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    writeFile(logFile, result.stdout + '\n' + result.stderr);

    const step = readJson<Step>(stepFile);
    step.status = 'done';
    step.finished_at = nowTimestamp();
    writeJson(stepFile, step);
  } catch (error: any) {
    const errorMsg = error.stderr || error.message || 'Script failed';
    writeFile(logFile, errorMsg);
    failRun(ctx.runDir, stepFile, errorMsg);
    process.exit(1);
  }
}

async function executeAiStep(
  ctx: StepContext,
  stepDef: StepDefinition,
  stepFile: string,
  baseLabel: string
): Promise<void> {
  const model = stepDef.model ?? ctx.config.default_model;

  // Update step to running
  const step = readJson<Step>(stepFile);
  step.status = 'running';
  step.started_at = nowTimestamp();
  writeJson(stepFile, step);

  if (stepDef.loop) {
    await executeLoopStep(ctx, stepDef, stepFile, baseLabel, model);
  } else {
    await executeSingleAiStep(ctx, stepDef, stepFile, baseLabel, model);
  }

  // Mark step as done
  const finalStep = readJson<Step>(stepFile);
  finalStep.status = 'done';
  finalStep.finished_at = nowTimestamp();
  writeJson(stepFile, finalStep);

  log(`step ${stepDef.id} — done`);
}

async function executeSingleAiStep(
  ctx: StepContext,
  stepDef: StepDefinition,
  stepFile: string,
  label: string,
  model: string
): Promise<void> {
  const promptFile = `/tmp/agentfarm-prompt-${label}.md`;
  await buildPrompt(ctx, stepDef.role!, promptFile);

  const result = await spawnAgent({
    command: ctx.config.spawn_command,
    promptFile,
    workdir: ctx.workdir,
    runDir: ctx.runDir,
    label,
    model,
    runId: ctx.runId,
    agentfarmDir: ctx.agentfarmDir,
    timeoutMinutes: ctx.config.step_timeout_minutes, // Fix 1: timeout par step
  });

  if (result.exitCode !== 0) {
    const errorLog = readLastLines(result.logFile, 5);
    failRun(ctx.runDir, stepFile, errorLog);
    throw new AgentSpawnError(stepDef.id, result.exitCode);
  }

  // Check if cancelled
  const runJsonPath = join(ctx.runDir, 'run.json');
  const currentRun = readJson<Run>(runJsonPath);
  if (currentRun.status === 'cancelled') {
    log(`run cancelled during step ${stepDef.id}`);
    process.exit(0);
  }
}

async function executeLoopStep(
  ctx: StepContext,
  stepDef: StepDefinition,
  stepFile: string,
  baseLabel: string,
  model: string
): Promise<void> {
  const planPath = join(ctx.runDir, 'plan.json');
  if (!fileExists(planPath)) {
    throw new Error('plan.json not found');
  }

  const plan = readJson<Plan>(planPath);

  for (const story of plan.stories) {
    if (story.status === 'done') continue;

    log(`story ${story.id} — ${story.title}`);

    // Update current story in step
    const step = readJson<Step>(stepFile);
    step.current_story = story.id;
    writeJson(stepFile, step);

    const label = `${baseLabel}-${story.id}`;
    const promptFile = `/tmp/agentfarm-prompt-${label}.md`;

    // Get agent profile if assigned
    let agentPath: string | undefined;
    if (story.agent) {
      const agentsJsonPath = join(ctx.agentfarmDir, 'agents.json');
      if (fileExists(agentsJsonPath)) {
        const agentsConfig = readJson<{ agents: Array<{ name: string; file: string }> }>(
          agentsJsonPath
        );
        const agent = agentsConfig.agents.find((a) => a.name === story.agent);
        if (agent) {
          agentPath = join(ctx.agentfarmDir, agent.file);
        }
      }
    }

    const taskOverride = `Story ${story.id}: ${story.title} (from task: ${ctx.run.task})`;
    await buildPrompt(ctx, stepDef.role!, promptFile, taskOverride, agentPath);

    const result = await spawnAgent({
      command: ctx.config.spawn_command,
      promptFile,
      workdir: ctx.workdir,
      runDir: ctx.runDir,
      label,
      model,
      runId: ctx.runId,
      agentfarmDir: ctx.agentfarmDir,
      timeoutMinutes: ctx.config.step_timeout_minutes, // Fix 1: timeout par step
    });

    // Check if cancelled
    const runJsonPath = join(ctx.runDir, 'run.json');
    const currentRun = readJson<Run>(runJsonPath);
    if (currentRun.status === 'cancelled') {
      log(`run cancelled during story ${story.id}`);
      process.exit(0);
    }

    if (result.exitCode !== 0) {
      const errorLog = readLastLines(result.logFile, 5);
      story.status = 'failed';
      story.error = errorLog;
      writeJson(planPath, plan);

      failRun(ctx.runDir, stepFile, `Story ${story.id} failed`);
      throw new AgentSpawnError(stepDef.id, result.exitCode);
    }

    story.status = 'done';
    writeJson(planPath, plan);
    log(`story ${story.id} — done`);
  }
}

async function buildPrompt(
  ctx: StepContext,
  role: string,
  outputPath: string,
  taskOverride?: string,
  agentPath?: string
): Promise<void> {
  const templatePath = join(ctx.agentfarmDir, 'prompts', `${role}.md`);
  let content = readFile(templatePath);

  // Load plan if exists
  let plan = '';
  const planPath = join(ctx.runDir, 'plan.json');
  if (fileExists(planPath)) {
    plan = readFile(planPath);
  }

  // Load agents list
  let agentsList = '';
  const agentsJsonPath = join(ctx.agentfarmDir, 'agents.json');
  if (fileExists(agentsJsonPath)) {
    const agentsConfig = readJson<{ agents: Array<{ name: string; description: string }> }>(
      agentsJsonPath
    );
    agentsList = agentsConfig.agents
      .map((a) => `- **${a.name}**: ${a.description}`)
      .join('\n');
  }

  // Replace placeholders
  const task = taskOverride ?? ctx.run.task;
  const repo = ctx.run.worktree ?? ctx.run.repo;

  content = content
    .replace(/{task}/g, task)
    .replace(/{repo}/g, repo)
    .replace(/{repo_origin}/g, ctx.run.repo)
    .replace(/{branch}/g, ctx.run.branch ?? '')
    .replace(/{run_id}/g, ctx.run.id)
    .replace(/{run_dir}/g, ctx.runDir)
    .replace(/{agentfarm_dir}/g, ctx.agentfarmDir)
    .replace(/{plan}/g, plan)
    .replace(/{agents}/g, agentsList);

  // Replace agent_prompt placeholder
  if (agentPath && fileExists(agentPath)) {
    const agentContent = readFile(agentPath);
    content = content.replace(/{agent_prompt}/g, agentContent);
  } else {
    content = content.replace(/{agent_prompt}/g, '');
  }

  writeFile(outputPath, content);
}

function failRun(runDir: string, stepFile: string, errorMsg: string): void {
  const ts = nowTimestamp();

  const step = readJson<Step>(stepFile);
  step.status = 'failed';
  step.finished_at = ts;
  step.error = errorMsg;
  writeJson(stepFile, step);

  const runJsonPath = join(runDir, 'run.json');
  const run = readJson<Run>(runJsonPath);
  run.status = 'failed';
  run.finished_at = ts;
  writeJson(runJsonPath, run);

  log(`FAILED — ${errorMsg}`);
}

function readLastLines(filePath: string, n: number): string {
  if (!fileExists(filePath)) {
    return 'unknown error';
  }
  const content = readFile(filePath);
  const lines = content.trim().split('\n');
  return lines.slice(-n).join('\n');
}
