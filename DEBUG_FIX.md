# AgentFarm OpenClaw Compatibility Fix

## Problem Identified

Agentfarm v1.0.1 agents get stuck at the plan step when using OpenClaw. 

**Root Cause**: The agent process never starts or crashes silently, leaving Agentfarm waiting indefinitely.

## Investigation Results

1. ✅ OpenClaw works when called directly
2. ❌ OpenClaw fails to start when called via Agentfarm spawn
3. ❌ No logs are generated in the worktree logs directory
4. ❌ No agent process visible in process list

## Potential Issues

1. **Environment variables**: AGENTFARM_* vars might confuse OpenClaw
2. **Command parsing**: Shell expansion might fail with complex prompts
3. **Working directory**: Agent might need specific cwd
4. **Timeout conflicts**: OpenClaw's own timeout vs Agentfarm's timeout

## Proposed Fixes

### Fix A: Add Debug Mode
- Add `--debug` flag to see exact command execution
- Log environment variables being passed
- Show working directory and full command

### Fix B: Simplify Command
- Remove complex environment variables  
- Use direct command without shell variables
- Pass prompt via file instead of env var

### Fix C: Better Error Handling
- Catch and log spawn failures immediately
- Don't wait silently for non-existent processes
- Add process monitoring with PID checking

## Implementation Priority

1. **Debug mode** first to see what's happening
2. **Error handling** to fail fast instead of hanging
3. **Command simplification** if needed