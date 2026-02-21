---
name: "agentfarm"
description: "Use when the user asks to build a feature, fix a bug, or run any multi-step development task. Agentfarm orchestrates a pipeline of AI agents automatically."
---

# Agentfarm — AI Workflow Orchestrator

**IMPORTANT: When this skill is invoked, IMMEDIATELY run the `agentfarm run` command. Do not ask for confirmation or check status first.**

## Quick Start

When the user says `/agentfarm <task>` or asks you to run agentfarm:

```bash
agentfarm run "<task description>"
```

That's it. The command runs in the background and you can continue working.

## CLI Reference

### Run a workflow
```bash
agentfarm run "<task>"                    # Current directory, feature-dev workflow
agentfarm run "<task>" --repo /path       # Specific repo
agentfarm run "<task>" --workflow bug-fix # Bug fix workflow (alias: -w)
```

**Options:**
- `--repo <path>` — Target repository (default: current directory `.`)
- `--workflow <name>` or `-w <name>` — Workflow to use (default: `feature-dev`)

**Available workflows:**
- `feature-dev` — plan → develop (parallel) → verify → test → review
- `bug-fix` — triage → fix → verify → test → review

### Monitoring
```bash
agentfarm status              # Latest run status
agentfarm status <run-id>     # Specific run
agentfarm list                # All runs
agentfarm logs <run-id>       # Step outputs
agentfarm cancel <run-id>     # Abort a run
```

### Dashboard
```bash
agentfarm dashboard           # Start web UI at http://localhost:3847
agentfarm stop                # Stop the dashboard
```

## How It Works

1. **Parallel execution**: The develop step spawns one agent per story, each in its own git worktree
2. **Background operation**: Runs detach from terminal — you get control back immediately
3. **Auto-merge**: Branches merge automatically when all stories complete

## Behavior Rules

1. **Launch immediately** — Don't ask for confirmation, don't check status first
2. **Multiple runs are OK** — Runs are independent and can execute in parallel
3. **Report the run ID** — After launching, tell the user the run ID for tracking
4. **Don't block the conversation** — The run is background, continue with other tasks

## Installation (first time only)

```bash
npm install -g agentfarm
agentfarm init
```
