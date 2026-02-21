import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileExists, readJson } from './fs.js';
import { ConfigNotFoundError } from './errors.js';
import type { Config } from '../types/index.js';

export function getConfigDir(): string {
  return join(homedir(), '.agentfarm');
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

export function configExists(): boolean {
  return fileExists(getConfigPath());
}

export function loadConfig(): Config {
  const configPath = getConfigPath();
  if (!fileExists(configPath)) {
    throw new ConfigNotFoundError();
  }
  return readJson<Config>(configPath);
}

export function getAgentfarmDir(): string {
  // In development: use the directory where the package is installed
  // This is determined by walking up from the current file location
  const currentFile = new URL(import.meta.url).pathname;
  // Go up from dist/utils/config.js to the package root
  return join(currentFile, '..', '..', '..');
}

export function getRunsDir(): string {
  return join(getAgentfarmDir(), 'runs');
}

export function getWorkflowsDir(): string {
  return join(getAgentfarmDir(), 'workflows');
}

export function getPromptsDir(): string {
  return join(getAgentfarmDir(), 'prompts');
}

export function getTemplatesDir(): string {
  return join(getAgentfarmDir(), 'templates');
}
