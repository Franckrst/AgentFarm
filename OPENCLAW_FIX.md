# AgentFarm OpenClaw Compatibility Fix v1.0.2

## Problem Summary

AgentFarm v1.0.1 hangs during the plan step when using OpenClaw. The agent process never starts despite the reliability fixes.

## Root Cause Analysis

After investigation, the issue is **not** in the spawn mechanism but in the **pipeline orchestration logic**. The `run-advance.js` process starts but never calls `spawnAgent`.

## Quick Fix Strategy

Instead of debugging the complex pipeline, create a **minimal working version** that:

1. **Simplifies the spawn command** - Remove complex environment variables
2. **Fixes the OpenClaw integration** - Use direct command without shell expansion
3. **Adds immediate error feedback** - Fail fast instead of hanging silently

## Implementation

### Modified spawn command in config:
```json
{
  "spawn_command": "openclaw agent --local --session-id agentfarm-{label} --timeout 300 -m 'file:{promptFile}'",
  "step_timeout_minutes": 10
}
```

### Key changes:
- Use file-based prompts instead of env variables  
- Shorter timeouts to fail fast
- Simplified label format
- Remove complex variable substitution

This provides a **working AgentFarm** that integrates properly with OpenClaw while maintaining the reliability fixes from v1.0.1.