# AgentFarm Reliability Fixes

This document describes the three priority fixes implemented to make AgentFarm more reliable.

## Fix 1: Agent Timeout Killer (Priority 1)

**Problem**: Agents get stuck without timeout/recovery mechanism.

**Solution**: Added brutal timeout per step in spawn command.

### Changes Made:
- Added `step_timeout_minutes` config parameter
- Modified `spawn.ts` to accept `timeoutMinutes` option
- Implemented timeout in execa command with proper error handling
- Returns exit code 124 for timeout (standard timeout exit code)
- Updated all config templates with default 120-minute timeout
- Updated all spawnAgent calls to pass the timeout parameter

### Usage:
```json
{
  "step_timeout_minutes": 120
}
```

## Fix 2: Automatic Cleanup (Priority 2)  

**Problem**: Failed worktrees accumulate and clutter the system.

**Solution**: Cleanup command for failed/old runs.

### Changes Made:
- Created `cleanup.ts` utility with configurable cleanup logic
- Added `agentfarm cleanup` command with options:
  - `--dry-run`: Show what would be cleaned without removing
  - `--days N`: Clean runs older than N days (default: 7)
  - `--all`: Clean all failed/cancelled runs, not just failed ones
- Proper worktree removal with git commands
- Fallback cleanup if git worktree fails

### Usage:
```bash
agentfarm cleanup --dry-run          # Preview cleanup
agentfarm cleanup --days 3          # Clean runs older than 3 days
agentfarm cleanup --all             # Clean failed + cancelled runs
```

## Fix 3: Centralized Logs

**Problem**: Logs scattered across multiple files make debugging difficult.

**Solution**: Single log file per run with all activities.

### Changes Made:
- Added `setLogContext()` function to initialize logging for a run
- Modified all log functions (info, error, advance, etc.) to write to both console and centralized log file
- Log file format: `[timestamp] LEVEL: message`
- Automatic log context initialization in `advanceRun()`
- Each run gets an `agentfarm.log` file in its run directory

### Benefits:
- Complete run history in one file
- Timestamped entries for debugging
- Fail-safe logging (continues if file writing fails)
- Searchable centralized logs

## Testing

Added comprehensive tests for:
- Cleanup functionality (Fix 2) - 3 test cases
- Log centralization (Fix 3) - 4 test cases  
- All tests pass and validate the fixes work correctly

## Backward Compatibility

All changes are backward compatible:
- New config options have sensible defaults
- Existing runs continue to work
- New commands are additive only