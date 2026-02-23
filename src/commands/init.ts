import prompts from 'prompts';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { symlinkSync, lstatSync, unlinkSync, readdirSync } from 'node:fs';
import type { CommandModule } from 'yargs';
import {
  getConfigDir,
  getConfigPath,
  configExists,
  getTemplatesDir,
  ensureDir,
  readJson,
  writeJson,
  fileExists,
  getAgentfarmDir,
} from '../utils/index.js';
import { success, error, info, warn } from '../utils/log.js';
import type { Config, ProviderType } from '../types/index.js';

interface InitArgs {
  force?: boolean;
}

export const init: CommandModule<object, InitArgs> = {
  command: 'init',
  describe: 'Configure Agentfarm for first use',
  builder: {
    force: {
      type: 'boolean',
      describe: 'Overwrite existing configuration',
      default: false,
    },
  },
  handler: async (argv) => {
    if (configExists() && !argv.force) {
      info('Configuration already exists at ' + getConfigPath());
      info('Use --force to overwrite.');
      return;
    }

    const response = await prompts([
      {
        type: 'select',
        name: 'provider',
        message: 'Which AI provider do you use?',
        choices: [
          { title: 'Claude Code', value: 'claude' },
          { title: 'OpenClaw', value: 'openclaw' },
          { title: 'OpenCode/Crush', value: 'opencode' },
        ],
      },
      {
        type: 'text',
        name: 'model',
        message: 'Default model?',
        initial: 'opus',
      },
    ]);

    if (!response.provider) {
      error('Setup cancelled.');
      process.exit(1);
    }

    // Load template for selected provider
    const templatePath = join(
      getTemplatesDir(),
      `config.${response.provider}.json`
    );

    let config: Config;
    try {
      config = readJson<Config>(templatePath);
    } catch {
      // Fallback to basic config
      config = {
        spawn_command: getDefaultSpawnCommand(response.provider),
        default_model: response.model,
        stuck_timeout_hours: 3,
      };
    }

    // Override model if specified
    if (response.model) {
      config.default_model = response.model;
    }

    // Save config
    const configDir = getConfigDir();
    ensureDir(configDir);
    writeJson(getConfigPath(), config);

    success(`Configuration saved to ${getConfigPath()}`);

    // Install skills for the selected provider
    info('');
    info('Installing skills...');
    installSkills(response.provider as ProviderType, argv.force ?? false);

    info('');
    info('To get started:');
    info('  agentfarm run "your task" --repo ./your-project');
  },
};

function getDefaultSpawnCommand(provider: ProviderType): string {
  switch (provider) {
    case 'claude':
      return 'claude --dangerously-skip-permissions -p "$AGENTFARM_PROMPT" --model "$AGENTFARM_MODEL"';
    case 'openclaw':
      return 'openclaw agent --local --session-id "$AGENTFARM_LABEL" --timeout 600 -m "$AGENTFARM_PROMPT"';
    case 'opencode':
      return 'opencode --prompt "$AGENTFARM_PROMPT" --model "$AGENTFARM_MODEL"';
    default:
      return 'echo "Provider not configured"';
  }
}

function getSkillsDir(provider: ProviderType): string {
  const home = homedir();
  switch (provider) {
    case 'claude':
      return join(home, '.claude', 'skills');
    case 'opencode':
      return join(home, '.crush', 'skills');
    case 'openclaw':
      return join(home, '.openclaw', 'skills');
    default:
      return join(home, '.claude', 'skills');
  }
}

function getSourceSkillsDir(provider: ProviderType): string {
  const agentfarmDir = getAgentfarmDir();
  switch (provider) {
    case 'claude':
      return join(agentfarmDir, '.claude', 'skills');
    case 'opencode':
      return join(agentfarmDir, '.crush', 'skills');
    case 'openclaw':
      return join(agentfarmDir, '.claude', 'skills'); // TODO: create .openclaw skills dir
    default:
      return join(agentfarmDir, '.claude', 'skills');
  }
}

function installSkills(provider: ProviderType, force: boolean): void {
  const sourceDir = getSourceSkillsDir(provider);
  const targetDir = getSkillsDir(provider);

  if (!fileExists(sourceDir)) {
    warn(`No skills found for provider ${provider}`);
    return;
  }

  ensureDir(targetDir);

  const skills = readdirSync(sourceDir);
  for (const skill of skills) {
    const sourcePath = join(sourceDir, skill);
    const targetPath = join(targetDir, skill);

    // Check if target already exists
    if (fileExists(targetPath)) {
      if (force) {
        // Remove existing symlink or directory
        try {
          const stats = lstatSync(targetPath);
          if (stats.isSymbolicLink()) {
            unlinkSync(targetPath);
          } else {
            warn(`Skipping ${skill}: target exists and is not a symlink`);
            continue;
          }
        } catch {
          warn(`Could not remove existing ${skill}`);
          continue;
        }
      } else {
        info(`Skill ${skill} already installed, skipping`);
        continue;
      }
    }

    // Create symlink
    try {
      symlinkSync(sourcePath, targetPath);
      success(`Installed skill: ${skill}`);
    } catch (err) {
      warn(`Failed to install skill ${skill}: ${err}`);
    }
  }
}
