import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import { openSync } from 'node:fs';
import { join } from 'node:path';
import type { CommandModule } from 'yargs';
import { getAgentfarmDir, fileExists, readFile, writeFile, unlinkSync } from '../utils/index.js';
import { success, error, info } from '../utils/log.js';

export const dashboard: CommandModule = {
  command: 'dashboard',
  describe: 'Start the web dashboard',
  handler: async () => {
    const agentfarmDir = getAgentfarmDir();
    const uiDir = join(agentfarmDir, 'ui');
    const pidFile = join(agentfarmDir, '.dashboard.pid');

    // Check if ui directory exists
    if (!fileExists(uiDir)) {
      error(`UI directory not found at ${uiDir}`);
      process.exit(1);
    }

    // Check if already running
    if (fileExists(pidFile)) {
      const pid = parseInt(readFile(pidFile).trim(), 10);
      try {
        process.kill(pid, 0); // Check if process exists
        // Already running, print URL and return
        const logFile = join(agentfarmDir, 'dashboard.log');
        if (fileExists(logFile)) {
          const logs = readFile(logFile);
          const match = logs.match(/http:\/\/localhost:\d+/);
          if (match) {
            success(`Dashboard: ${match[0]}`);
          }
        }
        return;
      } catch {
        // Stale PID file, remove it
        unlinkSync(pidFile);
      }
    }

    // Check if node_modules exists, install if not
    if (!fileExists(join(uiDir, 'node_modules'))) {
      info('Installing dashboard dependencies...');
      try {
        execSync('npm install --silent && npm run build', {
          cwd: uiDir,
          stdio: 'inherit',
        });
      } catch {
        error('Failed to install dependencies');
        process.exit(1);
      }
    }

    // Start dashboard in background
    const logFile = join(agentfarmDir, 'dashboard.log');
    const logFd = openSync(logFile, 'a');

    const child = spawn('node', ['server.js'], {
      cwd: uiDir,
      detached: true,
      stdio: ['ignore', logFd, logFd],
    });

    // Save PID
    writeFile(pidFile, String(child.pid));

    child.unref();

    // Wait briefly for server to start and print URL
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (fileExists(logFile)) {
      const logs = readFile(logFile);
      const match = logs.match(/http:\/\/localhost:\d+/);
      if (match) {
        success(`Dashboard: ${match[0]}`);
      }
    }
  },
};

export const stop: CommandModule = {
  command: 'stop',
  describe: 'Stop the web dashboard',
  handler: async () => {
    const agentfarmDir = getAgentfarmDir();
    const pidFile = join(agentfarmDir, '.dashboard.pid');

    if (!fileExists(pidFile)) {
      info('No dashboard running.');
      return;
    }

    const pid = parseInt(readFile(pidFile).trim(), 10);

    try {
      process.kill(pid, 0); // Check if exists
      process.kill(pid); // Kill it
      unlinkSync(pidFile);
      success('Dashboard stopped.');
    } catch {
      unlinkSync(pidFile);
      info('No dashboard running (stale PID file removed).');
    }
  },
};
