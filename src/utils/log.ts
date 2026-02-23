import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

// Fix 3: Logs centralisés - contexte global du run actuel
let currentRunDir: string | null = null;

export function setLogContext(runDir: string): void {
  currentRunDir = runDir;
}

function logToFile(level: string, message: string): void {
  if (currentRunDir) {
    try {
      const logFile = join(currentRunDir, 'agentfarm.log');
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
      appendFileSync(logFile, logLine);
    } catch (err) {
      // Silent fail for file logging to avoid recursive issues
    }
  }
}

export function info(message: string): void {
  console.log(`${COLORS.blue}agentfarm:${COLORS.reset} ${message}`);
  logToFile('info', message); // Fix 3: log centralisé
}

export function success(message: string): void {
  console.log(`${COLORS.green}agentfarm:${COLORS.reset} ${message}`);
  logToFile('success', message); // Fix 3: log centralisé
}

export function warn(message: string): void {
  console.log(`${COLORS.yellow}agentfarm:${COLORS.reset} ${message}`);
  logToFile('warn', message); // Fix 3: log centralisé
}

export function error(message: string): void {
  console.error(`${COLORS.red}agentfarm:${COLORS.reset} ${message}`);
  logToFile('error', message); // Fix 3: log centralisé
}

export function debug(message: string): void {
  if (process.env.AGENTFARM_DEBUG === '1') {
    console.log(`${COLORS.gray}agentfarm [debug]:${COLORS.reset} ${message}`);
    logToFile('debug', message); // Fix 3: log centralisé
  }
}

export function advance(message: string): void {
  console.log(`${COLORS.blue}advance:${COLORS.reset} ${message}`);
  logToFile('advance', message); // Fix 3: log centralisé
}
