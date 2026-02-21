import type { Run, WorkflowDef } from '../types'

interface BoardProps {
  runs: Run[]
  workflow: WorkflowDef
  children: (run: Run) => React.ReactNode
}

function getRunCurrentStep(run: Run): string | null {
  // Find the first non-done step (that's where the run is)
  if (run.status === 'completed') return '__completed'
  if (run.status === 'cancelled' || run.status === 'failed') {
    // Find the step that failed/was running
    const failedStep = run.steps.find(s => s.status === 'failed' || s.status === 'running')
    return failedStep?.id || run.steps[run.steps.length - 1]?.id || null
  }
  const current = run.steps.find(s => s.status === 'running' || s.status === 'pending')
  return current?.id || null
}

export default function Board({ runs, workflow, children }: BoardProps) {
  const columns = [
    ...workflow.steps.map(s => ({
      id: s.id,
      label: s.id,
      role: s.role,
      type: s.type,
    })),
    { id: '__completed', label: 'completed', role: undefined, type: 'done' },
  ]

  const grouped = columns.map(col => ({
    ...col,
    runs: runs.filter(r => {
      if (r.workflow !== workflow.name) return false
      return getRunCurrentStep(r) === col.id
    }),
  }))

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-10rem)]">
      {grouped.map((col, i) => {
        // Determine column border color based on runs in it
        const hasRunning = col.runs.some(r => r.status === 'running')
        const hasFailed = col.runs.some(r => r.status === 'failed')
        const isCompleted = col.id === '__completed'
        const borderColor = hasFailed ? 'border-red-500'
          : hasRunning ? 'border-blue-500'
          : isCompleted && col.runs.length > 0 ? 'border-green-500'
          : 'border-gray-700'

        return (
          <div key={col.id} className="flex-shrink-0 w-64">
            <div className={`border-t-2 ${borderColor} bg-gray-900 rounded-lg p-3 h-full`}>
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500 font-mono w-5">{isCompleted ? '✓' : i + 1}</span>
                <h2 className="text-sm font-semibold text-gray-300 capitalize">{col.id === '__completed' ? col.label : col.id}</h2>
                {col.role && col.role !== col.id && (
                  <span className="text-xs text-gray-600">{col.role}</span>
                )}
                {col.runs.length > 0 && (
                  <span className="ml-auto text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">
                    {col.runs.length}
                  </span>
                )}
              </div>
              {/* Runs */}
              <div className="space-y-3">
                {col.runs.map(run => (
                  <div key={run.id}>{children(run)}</div>
                ))}
                {col.runs.length === 0 && (
                  <p className="text-xs text-gray-700 italic">—</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
