import type { CommandModule } from 'yargs';
import { cleanupFailedRuns } from '../utils/cleanup.js';

interface CleanupArgs {
  'dry-run': boolean;
  days: number;
  all: boolean;
}

export const cleanupCommand: CommandModule<object, CleanupArgs> = {
  command: 'cleanup',
  describe: 'Fix 2: Clean up failed or old runs and their worktrees',
  builder: {
    'dry-run': {
      type: 'boolean',
      default: false,
      describe: 'Show what would be cleaned without actually removing anything',
    },
    days: {
      type: 'number',
      default: 7,
      describe: 'Clean runs older than N days',
    },
    all: {
      type: 'boolean',
      default: false,
      describe: 'Clean all failed/cancelled runs, not just failed ones',
    },
  },
  handler: async (argv) => {
    const cleaned = await cleanupFailedRuns({
      dryRun: argv['dry-run'],
      olderThanDays: argv.days,
      cleanFailedOnly: !argv.all,
    });
    
    if (argv['dry-run']) {
      console.log(`Would clean ${cleaned} runs`);
    } else {
      console.log(`Cleaned ${cleaned} runs`);
    }
  },
};