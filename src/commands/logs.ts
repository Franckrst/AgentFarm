import { join } from 'node:path';
import { readdirSync } from 'node:fs';
import type { CommandModule } from 'yargs';
import { getRunDir } from '../pipeline/run.js';
import { readJson, fileExists, readFile } from '../utils/index.js';
import { error } from '../utils/log.js';
import type { Step } from '../types/index.js';

interface LogsArgs {
  runId: string;
}

export const logs: CommandModule<object, LogsArgs> = {
  command: 'logs <run-id>',
  describe: 'Show logs for a run',
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

    if (!fileExists(runDir)) {
      error(`Run not found: ${runId}`);
      process.exit(1);
    }

    const stepsDir = join(runDir, 'steps');
    if (!fileExists(stepsDir)) {
      console.log('No steps found.');
      return;
    }

    const stepFiles = readdirSync(stepsDir).sort();

    for (const stepFile of stepFiles) {
      const step = readJson<Step>(join(stepsDir, stepFile));

      if (step.status === 'done') {
        console.log(`=== Step: ${step.id} ===`);

        // Try to find log file
        const logsDir = join(runDir, 'logs');
        if (fileExists(logsDir)) {
          const logFiles = readdirSync(logsDir);
          const matchingLog = logFiles.find((f) =>
            f.includes(step.id)
          );
          if (matchingLog) {
            const logContent = readFile(join(logsDir, matchingLog));
            console.log(logContent);
          } else {
            console.log('(no log file)');
          }
        }
        console.log('');
      }
    }
  },
};
