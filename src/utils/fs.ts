import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';

// Re-export commonly used Node.js fs functions for convenience
export { existsSync as fileExists, readdirSync, statSync, unlinkSync };

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

export function writeJson<T>(path: string, data: T): void {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

export function writeFile(path: string, content: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, content);
}
