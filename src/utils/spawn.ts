import { execa } from 'execa';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, readFile } from './fs.js';
import { advance } from './log.js';

export interface SpawnOptions {
  command: string;
  promptFile: string;
  workdir: string;
  runDir: string;
  label: string;
  model: string;
  runId: string;
  agentfarmDir: string;
  timeoutMinutes?: number; // Fix 1: timeout optionnel par step
}

export interface SpawnResult {
  exitCode: number;
  logFile: string;
}

export async function spawnAgent(options: SpawnOptions): Promise<SpawnResult> {
  const {
    command,
    promptFile,
    workdir,
    runDir,
    label,
    model,
    runId,
    agentfarmDir,
    timeoutMinutes,
  } = options;

  const logsDir = join(runDir, 'logs');
  ensureDir(logsDir);
  const logFile = join(logsDir, `${label}.log`);

  advance(`running agent (model=${model}, log=${logFile})`);

  if (process.env.AGENTFARM_DRY_RUN === '1') {
    advance('DRY RUN');
    return { exitCode: 0, logFile };
  }

  const promptContent = readFile(promptFile);

  // Build environment variables
  const env = {
    ...process.env,
    AGENTFARM_MODEL: model,
    AGENTFARM_LABEL: label,
    AGENTFARM_TASK_FILE: promptFile,
    AGENTFARM_DIR: agentfarmDir,
    AGENTFARM_RUN_ID: runId,
    AGENTFARM_RUN_DIR: runDir,
    AGENTFARM_PROMPT: promptContent,
  };

  // Create log file stream and wait for it to be ready
  const logStream = createWriteStream(logFile);
  await new Promise<void>((resolve, reject) => {
    logStream.on('open', () => resolve());
    logStream.on('error', reject);
  });

  try {
    // Parse and execute spawn command
    // The command uses shell syntax with variable substitution
    const execOptions: any = {
      cwd: workdir,
      env,
      stdin: 'ignore',
      stdout: logStream,
      stderr: logStream,
      reject: false,
    };

    // Fix 1: Ajouter timeout brutal si spécifié
    if (timeoutMinutes && timeoutMinutes > 0) {
      execOptions.timeout = timeoutMinutes * 60 * 1000; // Convert to milliseconds
      advance(`agent timeout set to ${timeoutMinutes} minutes`);
    }

    // DEBUG: Log exact command and environment
    advance(`DEBUG: About to execute command: ${command}`);
    advance(`DEBUG: Working directory: ${workdir}`);
    advance(`DEBUG: AGENTFARM_PROMPT length: ${env.AGENTFARM_PROMPT?.length || 0}`);
    advance(`DEBUG: AGENTFARM_LABEL: ${env.AGENTFARM_LABEL}`);

    const result = await execa('sh', ['-c', command], execOptions);

    logStream.close();
    return { exitCode: result.exitCode ?? 1, logFile };
  } catch (error: any) {
    logStream.close();
    
    // Check if error is from timeout
    if (error.timedOut) {
      advance(`agent TIMEOUT after ${timeoutMinutes} minutes`);
      return { exitCode: 124, logFile }; // 124 = timeout exit code
    }
    
    advance(`agent FAILED: ${error}`);
    return { exitCode: 1, logFile };
  }
}
