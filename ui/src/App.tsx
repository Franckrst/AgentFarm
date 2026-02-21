import { useState, useEffect } from 'react'
import { useRuns } from './hooks/useRuns'
import Board from './components/Board'
import RunCard from './components/RunCard'
import RunModal from './components/RunModal'
import HealthIndicator from './components/HealthIndicator'

function useHashParam(key: string): [string, (v: string) => void] {
  const read = () => new URLSearchParams(window.location.hash.slice(1)).get(key) || ''
  const [value, setValue] = useState(read)

  useEffect(() => {
    const onHash = () => setValue(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const set = (v: string) => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    if (v) params.set(key, v); else params.delete(key)
    window.location.hash = params.toString()
    setValue(v)
  }

  return [value, set]
}

export default function App() {
  const { data, error } = useRuns(5000)
  const [selectedWorkflow, setSelectedWorkflow] = useHashParam('workflow')
  const [selectedRunId, setSelectedRunId] = useHashParam('run')

  const workflowNames = data ? Object.keys(data.workflows) : []
  const activeWorkflow = selectedWorkflow || workflowNames[0] || ''
  const workflow = data?.workflows[activeWorkflow]
  const filteredRuns = data?.runs.filter(r => r.workflow === activeWorkflow) || []

  const selectedRun = selectedRunId ? data?.runs.find(r => r.id === selectedRunId) || null : null

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 sm:text-2xl">
              <img src="/logo.svg" alt="" className="w-6 h-6 sm:w-7 sm:h-7" />
              <span className="text-gray-100">Agentfarm</span>
            </h1>
          </div>

          {workflowNames.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {workflowNames.map(name => {
                const count = data?.runs.filter(r => r.workflow === name).length || 0
                const isActive = activeWorkflow === name
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedWorkflow(name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                  >
                    {name}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <HealthIndicator />
          {error && (
            <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">⚠ {error}</span>
          )}
          {data && (
            <span className="text-xs text-gray-500">
              {filteredRuns.length} run{filteredRuns.length !== 1 ? 's' : ''} • polling 5s
            </span>
          )}
        </div>
      </div>

      {/* Board */}
      {data && workflow ? (
        <Board runs={filteredRuns} workflow={workflow}>
          {(run) => <RunCard run={run} onClick={() => setSelectedRunId(run.id)} />}
        </Board>
      ) : !error ? (
        <p className="text-gray-500">Loading...</p>
      ) : null}

      {/* Modal */}
      {selectedRun && (
        <RunModal run={selectedRun} onClose={() => setSelectedRunId('')} />
      )}
    </div>
  )
}
