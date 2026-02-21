import { join } from 'node:path';
import {
  createWorktree,
  ensureGitignore,
  slugify,
  checkoutBranch,
  isGitRepo,
  initGitRepo,
} from '../utils/git.js';
import { fileExists, writeJson, readJson, readdirSync } from '../utils/fs.js';
import { advance, info } from '../utils/log.js';
import { WorktreeError } from '../utils/errors.js';
import { getRunDir, getRunsDir } from './run.js';
import type { Run } from '../types/index.js';

export async function setupWorktree(runId: string): Promise<void> {
  const runDir = getRunDir(runId);
  const runJsonPath = join(runDir, 'run.json');
  const run = readJson<Run>(runJsonPath);

  const repoPath = run.repo;
  const task = run.task;

  // Initialize git repo if needed
  if (!(await isGitRepo(repoPath))) {
    info(`Initializing git repository in ${repoPath}...`);
    await initGitRepo(repoPath);
  }

  // Slugify task for branch name
  const slug = slugify(task);
  const branch = `feat/agentfarm-${slug}`;
  const worktreeDir = join(repoPath, '.worktrees', runId);

  // Ensure .worktrees is in .gitignore
  ensureGitignore(repoPath, '.worktrees');

  // Check if worktree already exists
  if (fileExists(worktreeDir)) {
    advance(`worktree already exists at ${worktreeDir}`);
    try {
      await checkoutBranch(worktreeDir, branch);
    } catch {
      // Branch might not exist yet, ignore
    }
  } else {
    // Check if branch is already checked out elsewhere
    try {
      await createWorktree(repoPath, worktreeDir, branch);
    } catch (error) {
      // Find blocking run
      const blockingRunId = findBlockingRun(branch);
      if (blockingRunId) {
        throw new WorktreeError(
          `Branch '${branch}' is already checked out by run ${blockingRunId}.\n` +
            `To fix this, run: agentfarm cancel ${blockingRunId}`
        );
      }
      throw error;
    }
  }

  // Update run.json with worktree and branch
  const updatedRun: Run = {
    ...run,
    worktree: worktreeDir,
    branch,
  };
  writeJson(runJsonPath, updatedRun);

  advance(`worktree ${worktreeDir} on branch ${branch}`);
}

function findBlockingRun(branch: string): string | null {
  const runsDir = getRunsDir();
  if (!fileExists(runsDir)) {
    return null;
  }

  const entries = readdirSync(runsDir);

  for (const entry of entries) {
    const runJsonPath = join(runsDir, entry, 'run.json');
    if (fileExists(runJsonPath)) {
      const run = readJson<Run>(runJsonPath);
      if (run.branch === branch && run.status === 'running') {
        return run.id;
      }
    }
  }

  return null;
}
