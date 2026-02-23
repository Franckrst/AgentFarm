import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { setLogContext, info, error, advance } from '../../utils/log.js';

// Mock console to avoid output during tests
vi.mock('console', () => ({
  log: vi.fn(),
  error: vi.fn(),
}));

describe('log utility (Fix 3)', () => {
  let testLogDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create temporary directory for test logs
    testLogDir = join(tmpdir(), 'agentfarm-test-logs');
    rmSync(testLogDir, { recursive: true, force: true });
    mkdirSync(testLogDir, { recursive: true });
  });

  it('should write logs to centralized file when context is set', () => {
    setLogContext(testLogDir);
    
    info('Test info message');
    error('Test error message');
    advance('Test advance message');
    
    const logFile = join(testLogDir, 'agentfarm.log');
    expect(existsSync(logFile)).toBe(true);
    
    const logContent = readFileSync(logFile, 'utf8');
    expect(logContent).toContain('INFO: Test info message');
    expect(logContent).toContain('ERROR: Test error message');
    expect(logContent).toContain('ADVANCE: Test advance message');
  });

  it('should not fail when no log context is set', () => {
    // Reset context
    setLogContext('');
    
    // These should not throw errors even without context
    expect(() => {
      info('Test without context');
      error('Test error without context');
    }).not.toThrow();
  });

  it('should include timestamps in log entries', () => {
    setLogContext(testLogDir);
    
    info('Timestamped message');
    
    const logFile = join(testLogDir, 'agentfarm.log');
    const logContent = readFileSync(logFile, 'utf8');
    
    // Should contain ISO timestamp format
    expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    expect(logContent).toContain('INFO: Timestamped message');
  });

  it('should append multiple log entries', () => {
    setLogContext(testLogDir);
    
    info('First message');
    error('Second message');
    advance('Third message');
    
    const logFile = join(testLogDir, 'agentfarm.log');
    const logContent = readFileSync(logFile, 'utf8');
    const lines = logContent.trim().split('\n');
    
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('INFO: First message');
    expect(lines[1]).toContain('ERROR: Second message');
    expect(lines[2]).toContain('ADVANCE: Third message');
  });
});