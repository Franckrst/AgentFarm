import { join } from 'node:path';
import { execa } from 'execa';
import { info } from './log.js';
import { readJson, fileExists, readdirSync, statSync } from './fs.js';
import { getRunsDir } from '../pipeline/run.js';
import type { Run } from '../types/index.js';

export interface CleanupOptions {
  dryRun?: boolean;
  olderThanDays?: number;
  cleanFailedOnly?: boolean;
}

export async function cleanupFailedRuns(options: CleanupOptions = {}): Promise<number> {
  const { dryRun = false, olderThanDays = 7, cleanFailedOnly = true } = options;
  
  const runsDir = getRunsDir();
  if (!fileExists(runsDir)) {
    info('No runs directory found.');
    return 0;
  }

  const entries = readdirSync(runsDir);
  let cleaned = 0;
  const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

  info(`Fix 2: Scanning for ${cleanFailedOnly ? 'failed' : 'old'} runs older than ${olderThanDays} days...`);

  for (const entry of entries) {
    const runDir = join(runsDir, entry);
    const runJsonPath = join(runDir, 'run.json');
    
    if (!fileExists(runJsonPath)) continue;

    try {
      const run = readJson<Run>(runJsonPath);
      const stats = statSync(runJsonPath);
      
      // Check if run should be cleaned up
      const shouldClean = stats.mtimeMs < cutoffTime && 
        (cleanFailedOnly ? run.status === 'failed' : ['failed', 'cancelled'].includes(run.status));
      
      if (!shouldClean) continue;

      info(`${dryRun ? '[DRY RUN] ' : ''}Cleaning run ${run.id} (status=${run.status}, task="${run.task}")`);
      
      if (!dryRun) {
        // Clean up worktree if it exists
        if (run.worktree && run.worktree !== run.repo) {
          await cleanupWorktree(run.worktree, run.repo);
        }
        
        // Remove run directory
        await execa('rm', ['-rf', runDir]);
      }
      
      cleaned++;
    } catch (error) {
      info(`Warning: Failed to process run ${entry}: ${error}`);
    }
  }

  info(`Fix 2: ${dryRun ? 'Would clean' : 'Cleaned'} ${cleaned} runs`);
  return cleaned;
}

async function cleanupWorktree(worktreePath: string, repoPath: string): Promise<void> {
  try {
    // Remove worktree from git (this also removes the directory)
    await execa('git', ['worktree', 'remove', '--force', worktreePath], {
      cwd: repoPath,
      reject: false, // Don't throw if worktree doesn't exist
    });
    
    info(`Removed worktree: ${worktreePath}`);
  } catch (error) {
    info(`Warning: Failed to remove worktree ${worktreePath}: ${error}`);
    
    // Fallback: just remove the directory
    try {
      await execa('rm', ['-rf', worktreePath]);
      info(`Removed worktree directory manually: ${worktreePath}`);
    } catch (fallbackError) {
      info(`Error: Failed to remove directory ${worktreePath}: ${fallbackError}`);
    }
  }
}

export async function autoCleanup(): Promise<void> {
  // Clean failed runs older than 7 days
  await cleanupFailedRuns({
    dryRun: false,
    olderThanDays: 7,
    cleanFailedOnly: true,
  });
}