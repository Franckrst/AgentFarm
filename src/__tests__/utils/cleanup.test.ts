import { beforeEach, describe, it, expect, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { cleanupFailedRuns } from '../../utils/cleanup.js';
import * as run from '../../pipeline/run.js';

// Mock the getRunsDir function
vi.mock('../../pipeline/run.js', () => ({
  getRunsDir: vi.fn(),
}));

describe('cleanup utility (Fix 2)', () => {
  let testRunsDir: string;
  let mockGetRunsDir: any;

  beforeEach(() => {
    // Create temporary directory for test runs
    testRunsDir = join(tmpdir(), 'agentfarm-test-runs');
    rmSync(testRunsDir, { recursive: true, force: true });
    mkdirSync(testRunsDir, { recursive: true });
    
    // Mock getRunsDir to return our test directory
    mockGetRunsDir = vi.mocked(run.getRunsDir);
    mockGetRunsDir.mockReturnValue(testRunsDir);
  });

  it('should identify failed runs for cleanup', async () => {
    // Create a failed run older than 7 days
    const runId = 'test-failed-run';
    const runDir = join(testRunsDir, runId);
    mkdirSync(runDir);
    
    const runData = {
      id: runId,
      task: 'Test task',
      status: 'failed',
      repo: '/tmp/test-repo',
      workflow: 'feature-dev',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    };
    
    writeFileSync(join(runDir, 'run.json'), JSON.stringify(runData));
    
    // Set file modification time to 8 days ago
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const fs = await import('node:fs');
    fs.utimesSync(join(runDir, 'run.json'), eightDaysAgo, eightDaysAgo);

    const cleaned = await cleanupFailedRuns({ dryRun: true, olderThanDays: 7 });
    
    expect(cleaned).toBe(1);
  });

  it('should not clean recent failed runs', async () => {
    // Create a failed run from yesterday
    const runId = 'test-recent-failed';
    const runDir = join(testRunsDir, runId);
    mkdirSync(runDir);
    
    const runData = {
      id: runId,
      task: 'Recent test task',
      status: 'failed',
      repo: '/tmp/test-repo',
      workflow: 'feature-dev',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    };
    
    writeFileSync(join(runDir, 'run.json'), JSON.stringify(runData));

    const cleaned = await cleanupFailedRuns({ dryRun: true, olderThanDays: 7 });
    
    expect(cleaned).toBe(0);
  });

  it('should not clean successful runs by default', async () => {
    // Create a successful run older than 7 days
    const runId = 'test-success-run';
    const runDir = join(testRunsDir, runId);
    mkdirSync(runDir);
    
    const runData = {
      id: runId,
      task: 'Successful task',
      status: 'completed',
      repo: '/tmp/test-repo',
      workflow: 'feature-dev',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    writeFileSync(join(runDir, 'run.json'), JSON.stringify(runData));
    
    // Set file modification time to 8 days ago
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const fs = await import('node:fs');
    fs.utimesSync(join(runDir, 'run.json'), eightDaysAgo, eightDaysAgo);

    const cleaned = await cleanupFailedRuns({ 
      dryRun: true, 
      olderThanDays: 7, 
      cleanFailedOnly: true 
    });
    
    expect(cleaned).toBe(0);
  });
});