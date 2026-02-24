# AgentFarm v1.0.2 Deployment Instructions

## 🎯 Quick Deployment

### For OpenClaw Users (Recommended)

```bash
# 1. Uninstall old version
npm uninstall -g @franckrst/agentfarm

# 2. Install v1.0.2 from source (until NPM publish)
git clone https://github.com/Franckrst/AgentFarm.git
cd AgentFarm
git checkout v1.0.2
npm install
npm run build
npm install -g .

# 3. Initialize with OpenClaw config
agentfarm init
# Select "OpenClaw" when prompted

# 4. Update your Telegram ID in config
nano ~/.agentfarm/config.json
# Replace "YOUR_TELEGRAM_ID" with your actual Telegram chat ID
```

### Verify Installation

```bash
agentfarm --version
# Should show: 1.0.2

agentfarm cleanup --dry-run
# Should show: Fix 2: Would clean X runs
```

## 🧪 Test the Fix

```bash
cd /tmp
mkdir test-agentfarm && cd test-agentfarm
git init && echo "# Test" > README.md && git add . && git commit -m "init"

# This should either work quickly OR fail fast (within 5 minutes)
agentfarm run "Add hello.txt with Hello World"

# Monitor with:
agentfarm status
```

## 📦 Release Artifacts

- **Source**: GitHub v1.0.2 tag
- **Package**: Built locally (NPM publish pending)
- **Config**: Updated `config.openclaw.json` template
- **Docs**: CHANGELOG.md + RELEASE_NOTES_v1.0.2.md

## 🔧 Configuration Changes

Key differences from v1.0.1:

```json
{
  "step_timeout_minutes": 5,        // Was: 120 (or undefined)
  "spawn_command": "... --timeout 300 ...",  // Was: --timeout 600
  "notify_command": "openclaw message send ..."  // Was: openclaw send ...
}
```

## ✅ What's Fixed

1. **No more infinite hanging** - 5 minute timeout kills stuck agents
2. **Better error messages** - See exact spawn command in logs  
3. **OpenClaw compatibility** - Proper timeout and command format
4. **Fail-fast behavior** - Know within 5 minutes if something is broken

## 🚀 Next Steps

1. **Test thoroughly** with your workflows
2. **Report issues** on GitHub if problems persist  
3. **Adjust timeouts** if 5 minutes is too short for your tasks
4. **Publish to NPM** once stable (requires npm credentials)

---

**Note**: This is a **compatibility fix release**. The core workflow engine is unchanged, only timeout and OpenClaw integration improvements.