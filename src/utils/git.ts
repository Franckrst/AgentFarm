import { execa } from 'execa';
import { join } from 'node:path';
import { WorktreeError } from './errors.js';
import { fileExists, readFile, writeFile } from './fs.js';

export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--git-dir'], { cwd: repoPath });
    return true;
  } catch {
    return false;
  }
}

export async function initGitRepo(repoPath: string): Promise<void> {
  await execa('git', ['init'], { cwd: repoPath });
  // Create initial commit so worktrees can be created
  await execa('git', ['add', '-A'], { cwd: repoPath });
  await execa('git', ['commit', '--allow-empty', '-m', 'Initial commit'], {
    cwd: repoPath,
  });
}

export async function createBranch(
  repoPath: string,
  branchName: string
): Promise<void> {
  await execa('git', ['branch', branchName], { cwd: repoPath });
}

export async function createWorktree(
  repoPath: string,
  worktreePath: string,
  branch: string
): Promise<void> {
  try {
    // Try to create worktree with new branch
    await execa('git', ['worktree', 'add', '-b', branch, worktreePath], {
      cwd: repoPath,
    });
  } catch {
    // Branch might exist, try without -b
    try {
      await execa('git', ['worktree', 'add', worktreePath, branch], {
        cwd: repoPath,
      });
    } catch (error) {
      throw new WorktreeError(
        `Failed to create worktree at ${worktreePath}: ${error}`
      );
    }
  }
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string
): Promise<void> {
  try {
    await execa('git', ['worktree', 'remove', '--force', worktreePath], {
      cwd: repoPath,
    });
  } catch {
    // If git worktree remove fails, try rmdir
    const { rm } = await import('node:fs/promises');
    await rm(worktreePath, { recursive: true, force: true });
  }
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  const { stdout } = await execa('git', ['branch', '--show-current'], {
    cwd: repoPath,
  });
  return stdout.trim();
}

export async function checkoutBranch(
  repoPath: string,
  branch: string
): Promise<void> {
  await execa('git', ['checkout', branch], { cwd: repoPath });
}

export function ensureGitignore(repoPath: string, entry: string): void {
  const gitignorePath = join(repoPath, '.gitignore');
  if (fileExists(gitignorePath)) {
    const content = readFile(gitignorePath);
    if (!content.split('\n').includes(entry)) {
      writeFile(gitignorePath, content + '\n' + entry);
    }
  } else {
    writeFile(gitignorePath, entry + '\n');
  }
}

export function slugify(text: string, maxLength = 40): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, maxLength);
}
