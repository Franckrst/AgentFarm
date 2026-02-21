# AGENTS.md — Agentfarm for AI Agents

You are an AI agent. This file tells you how to install and use Agentfarm.

## Install (one-time)

```bash
cd ~/.openclaw/workspace
git clone https://gitlab.com/claude5564407/agentfarm.git
cd agentfarm
chmod +x bin/*
cp config.openclaw.json config.json
ln -s "$PWD/bin/agentfarm" /usr/local/bin/agentfarm 
```

Then set up the medic cron (hourly stuck check):
```bash
# system crontab
echo "0 * * * * $(pwd)/bin/unstick.sh --auto >> /var/log/agentfarm-medic.log 2>&1" | crontab -
```

## Usage

When your human asks you to build/fix something on a repo:

```bash
agentfarm run "description of the task" --repo /path/to/project
```

For bug fixes:
```bash
agentfarm run "description" --repo /path/to/project -w bug-fix
```

Then monitor:
```bash
agentfarm status          # latest run
agentfarm list            # all runs
agentfarm logs <run-id>   # step outputs
```

## How it works (don't touch)

- `advance.sh` is the engine — it chains agents automatically via callbacks
- `prompts/` contains role templates — planner, developer, verifier, tester, reviewer
- `config.json` has `$AGENTFARM_*` env vars in `spawn_command` — these are set automatically by advance.sh, **not by you**
- Each spawned agent calls `advance.sh` when done → next step starts
- **Do not modify** `bin/`, `prompts/`, or `workflows/` unless explicitly asked

## Workflows

| Workflow | Steps | Use when |
|----------|-------|----------|
| `feature-dev` | setup → plan → develop (parallel) → verify → test → review | New features, refactors |
| `bug-fix` | setup → triage → fix → verify → test → review | Bug fixes |

The develop step runs stories **in parallel** (git worktrees). Each story gets its own branch, merged automatically when all finish.

## Config

`config.json` is gitignored. `config.openclaw.json` is the template for OpenClaw setups. Don't commit secrets.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Pipeline stuck | `bin/unstick.sh --auto` |
| Step running but no agent process | Run `bash bin/advance.sh <run-id>` manually |
| Merge conflict after parallel develop | Check `/tmp/agentfarm-wt-*` worktrees, resolve manually |
| Agent didn't call advance.sh | Run `bash bin/advance.sh <run-id>` to continue |

## Dashboard

Live at `agentfarm.o6r.org` (if deployed). Or run locally:
```bash
cd ui && npm install && npm run build && node server.js
```

## Rules

- **Don't edit internals** unless the human asks
- **Don't run multiple workflows** on the same repo simultaneously
- **Do check `agentfarm status`** before starting a new run on a repo that might have one running
- **Do use `agentfarm cancel <id>`** to abort stuck runs before retrying
