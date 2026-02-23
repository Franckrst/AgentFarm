#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as commands from './commands/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

yargs(hideBin(process.argv))
  .scriptName('agentfarm')
  .version(pkg.version)
  .usage('agentfarm v$0 — lightweight AI workflow orchestrator\n\nUsage: $0 <command> [options]')
  .command(commands.init)
  .command(commands.run)
  .command(commands.status)
  .command(commands.list)
  .command(commands.logs)
  .command(commands.cancel)
  .command(commands.dashboard)
  .command(commands.stop)
  .command(commands.cleanupCommand) // Fix 2: cleanup command
  .demandCommand(1, 'You must specify a command')
  .help()
  .alias('h', 'help')
  .alias('v', 'version')
  .strict()
  .parse();
