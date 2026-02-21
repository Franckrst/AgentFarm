import type { CommandModule } from 'yargs';
import { getAllRuns } from '../pipeline/run.js';

export const list: CommandModule<object, object> = {
  command: 'list',
  describe: 'List all runs',
  handler: async () => {
    const runs = getAllRuns();

    if (runs.length === 0) {
      console.log('No runs found.');
      return;
    }

    // Sort by ID
    runs.sort((a, b) => a.id.localeCompare(b.id));

    // Print table
    console.log(
      `${'ID'.padEnd(12)} ${'STATUS'.padEnd(12)} TASK`
    );
    console.log(
      `${'---'.padEnd(12)} ${'---'.padEnd(12)} ---`
    );

    for (const run of runs) {
      const taskTrunc = run.task.slice(0, 60);
      console.log(
        `${run.id.padEnd(12)} ${run.status.padEnd(12)} ${taskTrunc}`
      );
    }
  },
};
