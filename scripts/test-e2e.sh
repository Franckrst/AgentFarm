#!/bin/bash
set -euo pipefail

# AgentFarm End-to-End Test
# Tests the complete workflow: init -> plan -> execute -> merge

# Configuration
TEST_DIR="/tmp/test-agentfarm-e2e-$$"
TIMEOUT_MINUTES=5
AGENTFARM_BIN="$(cd "$(dirname "$0")/.." && pwd)/dist/cli.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[E2E]${NC} $*"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

cleanup() {
    log "Cleaning up test directory: $TEST_DIR"
    rm -rf "$TEST_DIR" 2>/dev/null || true
}

# Trap cleanup on exit
trap cleanup EXIT

test_agentfarm_binary() {
    log "Checking AgentFarm binary..."
    if [ ! -f "$AGENTFARM_BIN" ]; then
        error "AgentFarm binary not found at $AGENTFARM_BIN"
        error "Please run 'npm run build' first"
        exit 1
    fi
    
    # Test basic command
    if ! node "$AGENTFARM_BIN" --help >/dev/null 2>&1; then
        error "AgentFarm binary is not working"
        exit 1
    fi
    
    log "AgentFarm binary OK"
}

create_test_repo() {
    log "Creating test repository in $TEST_DIR"
    
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    
    # Initialize git repo
    git init --quiet
    git config user.name "AgentFarm E2E Test"
    git config user.email "test@agentfarm.local"
    
    # Create initial file
    echo "Hello World" > test.txt
    echo "console.log('Hello');" > hello.js
    
    # Create .gitignore
    cat > .gitignore << EOF
node_modules/
.agentfarm/
*.log
EOF
    
    # Initial commit
    git add .
    git commit -m "Initial commit" --quiet
    
    log "Test repository created with files:"
    ls -la
}

initialize_agentfarm() {
    log "Initializing AgentFarm in test repo..."
    
    cd "$TEST_DIR"
    
    # Initialize agentfarm with openclaw config
    if ! timeout 30 node "$AGENTFARM_BIN" init --force 2>&1; then
        error "AgentFarm initialization failed"
        exit 1
    fi
    
    log "AgentFarm initialized successfully"
    
    # Verify config files exist
    if [ ! -f ".agentfarm/config.json" ]; then
        error "AgentFarm config not created"
        exit 1
    fi
    
    log "Config files verified"
}

run_simple_task() {
    log "Running simple task: Add exclamation mark to test.txt"
    
    cd "$TEST_DIR"
    
    # Run the task with timeout
    local task="Add exclamation mark at the end of test.txt file"
    
    log "Starting task with ${TIMEOUT_MINUTES}min timeout..."
    if ! timeout $((TIMEOUT_MINUTES * 60)) node "$AGENTFARM_BIN" run "$task" --repo . 2>&1; then
        error "Task execution failed or timed out"
        
        # Show recent logs for debugging
        log "Recent AgentFarm logs:"
        find .agentfarm/runs -name "*.log" -type f -exec tail -n 5 {} \; 2>/dev/null || true
        
        exit 1
    fi
    
    log "Task completed"
}

verify_results() {
    log "Verifying results..."
    
    cd "$TEST_DIR"
    
    # Check if test.txt was modified correctly
    if [ ! -f "test.txt" ]; then
        error "test.txt file not found"
        exit 1
    fi
    
    local content=$(cat test.txt)
    log "test.txt content: '$content'"
    
    # Check if exclamation mark was added
    if [[ "$content" == *"!"* ]]; then
        log "✅ SUCCESS: Exclamation mark found in test.txt"
    else
        error "❌ FAILURE: Exclamation mark not found in test.txt"
        error "Expected content with '!' but got: '$content'"
        exit 1
    fi
    
    # Check git history
    log "Git history:"
    git log --oneline -3
    
    # Verify we're back on main branch
    local current_branch=$(git branch --show-current)
    if [ "$current_branch" = "main" ]; then
        log "✅ SUCCESS: Back on main branch"
    else
        warn "⚠️  Currently on branch: $current_branch (expected: main)"
    fi
    
    log "✅ All verifications passed!"
}

show_stats() {
    log "Test statistics:"
    cd "$TEST_DIR"
    
    # Show AgentFarm runs
    if [ -d ".agentfarm/runs" ]; then
        local run_count=$(find .agentfarm/runs -maxdepth 1 -type d | wc -l)
        log "AgentFarm runs: $((run_count - 1))" # -1 for the runs directory itself
        
        # Show last run info if available
        local last_run=$(find .agentfarm/runs -maxdepth 1 -type d -name "run-*" | sort | tail -1)
        if [ -n "$last_run" ] && [ -f "$last_run/run.json" ]; then
            log "Last run status: $(jq -r '.status // "unknown"' "$last_run/run.json" 2>/dev/null || echo "unknown")"
        fi
    fi
    
    # Show git commits
    local commit_count=$(git rev-list --count HEAD)
    log "Total commits: $commit_count"
}

main() {
    log "🚀 Starting AgentFarm End-to-End Test"
    log "Test directory: $TEST_DIR"
    log "Timeout: ${TIMEOUT_MINUTES} minutes"
    log "AgentFarm binary: $AGENTFARM_BIN"
    
    # Run test steps
    test_agentfarm_binary
    create_test_repo
    initialize_agentfarm
    run_simple_task
    verify_results
    show_stats
    
    log "🎉 END-TO-END TEST PASSED!"
    log "AgentFarm is working correctly"
    
    exit 0
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --timeout)
            TIMEOUT_MINUTES="$2"
            shift 2
            ;;
        --keep-files)
            trap - EXIT  # Disable cleanup
            log "Files will be kept in $TEST_DIR"
            shift
            ;;
        --help)
            echo "Usage: $0 [--timeout MINUTES] [--keep-files] [--help]"
            echo ""
            echo "Options:"
            echo "  --timeout MINUTES   Set timeout in minutes (default: 5)"
            echo "  --keep-files       Keep test files after completion"
            echo "  --help            Show this help"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"