import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson, writeJson, ensureDir, fileExists } from '../../utils/fs.js';

describe('fs utilities', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentfarm-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true });
  });

  it('writes and reads JSON', () => {
    const filePath = join(testDir, 'test.json');
    const data = { foo: 'bar', num: 42 };

    writeJson(filePath, data);
    const result = readJson<typeof data>(filePath);

    expect(result).toEqual(data);
  });

  it('creates nested directories', () => {
    const nestedPath = join(testDir, 'a', 'b', 'c');

    ensureDir(nestedPath);

    expect(fileExists(nestedPath)).toBe(true);
  });

  it('fileExists returns false for missing files', () => {
    expect(fileExists(join(testDir, 'nonexistent'))).toBe(false);
  });
});
