import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import type { CommandModule } from 'yargs';
import { initializeRun, getRunDir } from '../pipeline/run.js';
import { setupWorktree } from '../pipeline/setup.js';
import { success, info, error } from '../utils/log.js';
import { configExists, getAgentfarmDir } from '../utils/index.js';

interface RunArgs {
  task: string;
  repo: string;
  workflow: string;
}

export const run: CommandModule<object, RunArgs> = {
  command: 'run <task>',
  describe: 'Start a new workflow run',
  builder: {
    task: {
      type: 'string',
      demandOption: true,
      describe: 'Task description',
    },
    repo: {
      type: 'string',
      default: '.',
      describe: 'Path to the repository (defaults to current directory)',
    },
    workflow: {
      type: 'string',
      alias: 'w',
      default: 'feature-dev',
      describe: 'Workflow to use',
    },
  },
  handler: async (argv) => {
    if (!configExists()) {
      error('Configuration not found. Run "agentfarm init" first.');
      process.exit(1);
    }

    const repoPath = resolve(argv.repo);

    // Initialize run
    const runObj = await initializeRun({
      task: argv.task,
      repoPath,
      workflowName: argv.workflow,
    });

    info('');
    success(`Run created: ${runObj.id}`);

    // Setup worktree
    await setupWorktree(runObj.id);

    // Start dashboard
    const { dashboard } = await import('./dashboard.js');
    try {
      await dashboard.handler({} as any);
    } catch {
      // Dashboard is a stub, ignore errors
    }

    info('');
    info(`Run started in background. Use 'agentfarm status ${runObj.id}' to check progress.`);

    // Start advance in background
    const runDir = getRunDir(runObj.id);
    const advanceLogPath = `${runDir}/advance.log`;

    const agentfarmDir = getAgentfarmDir();
    const advanceScript = `${agentfarmDir}/dist/run-advance.js`;

    const { openSync } = await import('node:fs');
    const logFd = openSync(advanceLogPath, 'a');

    const child = spawn('node', [advanceScript, runObj.id], {
      cwd: agentfarmDir,
      detached: true,
      stdio: ['ignore', logFd, logFd],
    });

    child.unref();
  },
};
