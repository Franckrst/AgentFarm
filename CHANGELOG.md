# Changelog

## [1.0.2] - 2026-02-24

### Fixed
- **OpenClaw Integration**: Fixed compatibility issues with OpenClaw agents
- **Timeout Configuration**: Reduced default step timeout to 5 minutes for faster failure detection  
- **Debug Logging**: Added detailed logging to spawn process for troubleshooting
- **Configuration**: Updated default OpenClaw config with proper timeout values
- **Error Handling**: Improved error reporting when agents fail to start

### Changed
- Default `step_timeout_minutes` from 120 to 5 minutes
- Enhanced spawn command debugging
- Better error messages for configuration issues

### Technical Details
- Added DEBUG logging to spawn.ts for command execution
- Modified default config.openclaw.json with shorter timeouts
- Fixed agent process hanging issues with OpenClaw integration

## [1.0.1] - 2026-02-xx

### Added
- **Fix 1: Agent Timeout Killer** - Brutal timeout per step to prevent hanging
- **Fix 2: Automatic Cleanup** - Command to clean up failed/old worktrees  
- **Fix 3: Centralized Logs** - Single log file per run with all activities

### New Features
- `agentfarm cleanup` command with --dry-run, --days, --all options
- `step_timeout_minutes` configuration parameter
- Centralized logging to `agentfarm.log` per run
- Better error handling for stuck agents

## [1.0.0] - Initial Release
- Basic AgentFarm functionality
- Git worktree management
- AI agent orchestration
- Multi-step workflow support