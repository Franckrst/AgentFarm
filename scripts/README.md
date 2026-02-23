# AgentFarm Scripts

This directory contains utility scripts for AgentFarm.

## test-e2e.sh

End-to-end test script that validates the complete AgentFarm workflow.

### Usage

```bash
# Run with default 5-minute timeout
./scripts/test-e2e.sh

# Run with custom timeout
./scripts/test-e2e.sh --timeout 3

# Keep test files for debugging
./scripts/test-e2e.sh --keep-files

# Via npm scripts
npm run test:e2e
npm run test:e2e:quick  # 3-minute timeout
```

### What it tests

1. **Binary functionality** - Verifies AgentFarm CLI works
2. **Repository setup** - Creates a test git repo with sample files  
3. **Initialization** - Tests `agentfarm init`
4. **Task execution** - Runs a simple task to modify a file
5. **Result verification** - Checks that the task completed correctly
6. **Cleanup** - Verifies proper worktree cleanup and main branch restore

### Exit codes

- `0` - Test passed
- `1` - Test failed
- `124` - Timeout (when using timeout command)

### Debugging

Use `--keep-files` to inspect the test repository after completion:

```bash
./scripts/test-e2e.sh --keep-files
# Check /tmp/test-agentfarm-e2e-* directory
```

The script provides detailed logging and shows AgentFarm run logs on failure.