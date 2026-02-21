#!/usr/bin/env node
import { advanceRun } from './pipeline/advance.js';

const runId = process.argv[2];

if (!runId) {
  console.error('Usage: run-advance.js <run-id>');
  process.exit(1);
}

advanceRun(runId).catch((error) => {
  console.error('Advance failed:', error);
  process.exit(1);
});
