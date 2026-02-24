# AgentFarm v1.0.2 - OpenClaw Compatibility Fix

## 🚀 What's New

This release specifically addresses **compatibility issues with OpenClaw** that caused agents to hang indefinitely during the planning phase.

## ✅ Fixed Issues

### 🔧 **OpenClaw Integration**
- **Problem**: Agents would hang forever at the "plan" step when using OpenClaw
- **Solution**: Fixed spawn command configuration and added fail-fast timeouts
- **Result**: Agents now start properly or fail quickly with clear error messages

### ⏱️ **Timeout Configuration** 
- **Reduced default timeout**: From 120 minutes to **5 minutes** per step
- **Faster failure detection**: No more waiting an hour to see if something is broken
- **Configurable**: Still adjustable via `step_timeout_minutes` in config

### 🐛 **Debug Improvements**
- **Enhanced logging**: See exactly what command is being executed
- **Better error messages**: Clear feedback when agents fail to start
- **Process monitoring**: Track agent lifecycle more effectively

## 📦 Installation

### Update from v1.0.1
```bash
npm install -g @franckrst/agentfarm@1.0.2
```

### Fresh Install
```bash
npm install -g @franckrst/agentfarm
agentfarm init
```

## ⚙️ Configuration

The OpenClaw configuration template (`config.openclaw.json`) has been updated with:

```json
{
  "spawn_command": "openclaw agent --local --session-id \"$AGENTFARM_LABEL\" --timeout 300 -m \"$AGENTFARM_PROMPT\"",
  "step_timeout_minutes": 5,
  "notify_command": "openclaw message send --channel telegram --target YOUR_TELEGRAM_ID --message '{message}'"
}
```

**Don't forget to**:
1. Update `YOUR_TELEGRAM_ID` with your actual Telegram chat ID
2. Adjust `step_timeout_minutes` if 5 minutes is too short for your workflows

## 🧪 Testing

Tested with:
- ✅ OpenClaw agent integration
- ✅ Fail-fast timeout behavior  
- ✅ Error handling and cleanup
- ✅ All reliability fixes from v1.0.1

## 🔗 Links

- **Repository**: https://github.com/Franckrst/AgentFarm
- **Issues**: Report problems at https://github.com/Franckrst/AgentFarm/issues
- **Documentation**: See README.md for full usage guide

---

**Note**: If you're still experiencing hanging issues, try reducing `step_timeout_minutes` to 2-3 minutes for even faster feedback during debugging.