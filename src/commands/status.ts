import { join } from 'node:path';
import { readdirSync } from 'node:fs';
import type { CommandModule } from 'yargs';
import {
  getRunDir,
  loadRun,
  findMostRecentRunId,
} from '../pipeline/run.js';
import { readJson, fileExists } from '../utils/index.js';
import { error } from '../utils/log.js';
import type { Step } from '../types/index.js';

interface StatusArgs {
  runId?: string;
}

export const status: CommandModule<object, StatusArgs> = {
  command: 'status [run-id]',
  describe: 'Show status of a run',
  builder: {
    'run-id': {
      type: 'string',
      describe: 'Run ID (defaults to most recent)',
    },
  },
  handler: async (argv) => {
    let runId: string | null | undefined = argv.runId;

    if (!runId) {
      runId = findMostRecentRunId();
      if (!runId) {
        error('No runs found.');
        process.exit(1);
      }
    }

    const resolvedRunId: string = runId;
    const runDir = getRunDir(resolvedRunId);
    const runJsonPath = join(runDir, 'run.json');

    if (!fileExists(runJsonPath)) {
      error(`Run not found: ${resolvedRunId}`);
      process.exit(1);
    }

    const run = loadRun(resolvedRunId);

    console.log(`=== Run: ${runId} ===`);
    console.log(`Task:       ${run.task}`);
    console.log(`Status:     ${run.status}`);
    console.log(`Workflow:   ${run.workflow}`);
    console.log(`Created:    ${run.created_at}`);
    console.log('');
    console.log('Steps:');

    const stepsDir = join(runDir, 'steps');
    if (fileExists(stepsDir)) {
      const stepFiles = readdirSync(stepsDir).sort();
      for (const stepFile of stepFiles) {
        const step = readJson<Step>(join(stepsDir, stepFile));
        let line = `  [${step.status}] ${step.id} (${step.type})`;
        if (step.error) {
          line += `\n    Error: ${step.error}`;
        }
        console.log(line);
      }
    }
  },
};
