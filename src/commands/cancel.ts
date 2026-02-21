import { join } from 'node:path';
import type { CommandModule } from 'yargs';
import { getRunDir, loadRun, saveRun } from '../pipeline/run.js';
import { removeWorktree } from '../utils/git.js';
import { readJson, writeJson, fileExists, readFile, readdirSync, unlinkSync } from '../utils/index.js';
import { success, error, info } from '../utils/log.js';
import type { Step } from '../types/index.js';

interface CancelArgs {
  runId: string;
}

export const cancel: CommandModule<object, CancelArgs> = {
  command: 'cancel <run-id>',
  describe: 'Cancel a running workflow',
  builder: {
    'run-id': {
      type: 'string',
      demandOption: true,
      describe: 'Run ID',
    },
  },
  handler: async (argv) => {
    const runId = argv.runId ?? argv['run-id'];
    const runDir = getRunDir(runId);
    const runJsonPath = join(runDir, 'run.json');

    if (!fileExists(runJsonPath)) {
      error(`Run not found: ${runId}`);
      process.exit(1);
    }

    // Update run status
    const run = loadRun(runId);
    run.status = 'cancelled';
    saveRun(run);

    // Cancel running/pending steps
    const stepsDir = join(runDir, 'steps');
    if (fileExists(stepsDir)) {
      const stepFiles = readdirSync(stepsDir);
      for (const stepFile of stepFiles) {
        const stepPath = join(stepsDir, stepFile);
        const step = readJson<Step>(stepPath);

        if (step.status === 'running' || step.status === 'pending') {
          step.status = 'cancelled';
          writeJson(stepPath, step);
        }
      }
    }

    // Kill running agent process
    const pidFile = join(runDir, 'agent.pid');
    if (fileExists(pidFile)) {
      const pid = parseInt(readFile(pidFile).trim(), 10);
      try {
        process.kill(pid);
        info('Killed running agent');
      } catch {
        // Process might already be dead
      }
      unlinkSync(pidFile);
    }

    // Clean up worktree if it exists
    if (run.worktree && fileExists(run.worktree)) {
      info(`Cleaning up worktree at ${run.worktree}...`);
      try {
        await removeWorktree(run.repo, run.worktree);
      } catch {
        // Ignore cleanup errors
      }
    }

    success(`Run ${runId} cancelled.`);
  },
};
