import express from 'express'
import { createServer } from 'net'
import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const DEFAULT_PORT = 4455
const MAX_PORT_ATTEMPTS = 100

// Check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close()
      resolve(true)
    })
    server.listen(port)
  })
}

// Find an available port starting from defaultPort
async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + MAX_PORT_ATTEMPTS; port++) {
    if (await isPortAvailable(port)) {
      return port
    }
  }
  throw new Error(`No available port found between ${startPort} and ${startPort + MAX_PORT_ATTEMPTS}`)
}

// Agentfarm dir = parent of ui/
const AGENTFARM_DIR = process.env.AGENTFARM_DIR || join(__dirname, '..')
const RUNS_DIR = join(AGENTFARM_DIR, 'runs')
const WORKFLOWS_DIR = join(AGENTFARM_DIR, 'workflows')

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf-8'))
  } catch { return null }
}

app.get('/api/runs', async (req, res) => {
  try {
    const entries = await readdir(RUNS_DIR, { withFileTypes: true }).catch(() => [])
    const runs = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const runDir = join(RUNS_DIR, entry.name)
      const runJson = await readJson(join(runDir, 'run.json'))
      if (!runJson) continue
      const stepsDir = join(runDir, 'steps')
      const stepFiles = await readdir(stepsDir).catch(() => [])
      const steps = []
      const sortedStepFiles = stepFiles.filter(sf => sf.endsWith('.json')).sort()
      for (const sf of sortedStepFiles) {
        const step = await readJson(join(stepsDir, sf))
        if (step) steps.push(step)
      }
      // Include plan.json if it exists
      const plan = await readJson(join(runDir, 'plan.json'))
      runs.push({ ...runJson, steps, plan: plan || null })
    }
    const wfEntries = await readdir(WORKFLOWS_DIR).catch(() => [])
    const workflows = {}
    for (const wf of wfEntries) {
      if (!wf.endsWith('.json')) continue
      const data = await readJson(join(WORKFLOWS_DIR, wf))
      if (data) workflows[data.name || wf.replace('.json', '')] = data
    }
    res.json({ runs, workflows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Stream agent log (last N lines, default 100)
app.get('/api/runs/:runId/logs/:label', async (req, res) => {
  const { runId, label } = req.params
  if (!/^agentfarm-[a-zA-Z0-9._-]+$/.test(label)) {
    return res.status(400).send('Invalid label')
  }
  const tail = parseInt(req.query.tail) || 100
  const logPath = join(RUNS_DIR, runId, 'logs', `${label}.log`)
  try {
    const content = await readFile(logPath, 'utf-8')
    const lines = content.split('\n')
    const last = lines.slice(-tail).join('\n')
    res.type('text/plain').send(last)
  } catch {
    res.type('text/plain').send('')
  }
})

// Health check endpoint - returns status and timestamp
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

app.use(express.static(join(__dirname, 'dist')))
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

// Start server with automatic port selection
async function startServer() {
  const port = await findAvailablePort(DEFAULT_PORT)
  app.listen(port, () => {
    console.log(`Agentfarm UI listening on http://localhost:${port}`)
    console.log(`Health check available at http://localhost:${port}/health`)
  })
}

// Export app for testing
export { app }

// Only start server when run directly (not imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  startServer().catch(err => {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  })
}
