import { useState, useRef, useEffect } from 'react'
import type { Run, Step, Story } from '../types'
import { useLog } from '../hooks/useLog'

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-400',
  running: 'text-blue-400',
  done: 'text-green-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
  cancelled: 'text-gray-500',
}

const STATUS_DOTS: Record<string, string> = {
  pending: 'bg-gray-600',
  running: 'bg-blue-500 animate-pulse',
  done: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-600',
}

function fmt(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

function duration(start?: string, end?: string): string {
  if (!start) return '—'
  const from = new Date(start).getTime()
  const to = end ? new Date(end).getTime() : Date.now()
  const secs = Math.floor((to - from) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ${secs % 60}s`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function StepRow({ step, isSelected, onClick }: { step: Step; isSelected: boolean; onClick: () => void }) {
  const dot = STATUS_DOTS[step.status] || 'bg-gray-600'
  const color = STATUS_COLORS[step.status] || 'text-gray-400'

  return (
    <div
      className={`flex items-start gap-3 py-2 border-b border-gray-800 last:border-0 cursor-pointer rounded px-1 ${isSelected ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}
      onClick={onClick}
    >
      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">{step.id}</span>
          {step.role && step.role !== step.id && (
            <span className="text-xs text-gray-500">({step.role})</span>
          )}
          <span className={`text-xs ml-auto ${color}`}>{step.status}</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5 flex gap-3">
          {step.started_at && <span>Started: {fmt(step.started_at)}</span>}
          {step.finished_at && <span>Done: {fmt(step.finished_at)}</span>}
          {step.started_at && <span>⏱ {duration(step.started_at, step.finished_at)}</span>}
        </div>
        {step.current_story && (
          <div className="text-xs text-blue-300 mt-1">📖 {step.current_story}</div>
        )}
        {step.error && (
          <div className="text-xs text-red-400 mt-1 bg-red-950/50 rounded px-2 py-1 font-mono whitespace-pre-wrap">❌ {step.error}</div>
        )}
      </div>
    </div>
  )
}

function StoryRow({ story, isSelected, onClick }: { story: Story; isSelected: boolean; onClick: () => void }) {
  const isDone = story.status === 'done'
  const isFailed = story.status === 'failed'
  return (
    <div
      className={`flex items-start gap-3 py-2 border-b border-gray-800 last:border-0 cursor-pointer rounded px-1 ${isSelected ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}
      onClick={onClick}
    >
      <span className="text-sm mt-0.5">{isDone ? '✅' : isFailed ? '❌' : '⬜'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">{story.id}</span>
          <span className="text-sm text-gray-200">{story.title}</span>
          {story.agent && (
            <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded ml-auto">{story.agent}</span>
          )}
        </div>
        {story.error && (
          <div className="text-xs text-red-400 mt-1 bg-red-950/50 rounded px-2 py-1 font-mono whitespace-pre-wrap">❌ {story.error}</div>
        )}
        {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {story.acceptance_criteria.map((ac, i) => (
              <li key={i} className="text-xs text-gray-500">• {ac}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function LogPanel({ runId, label }: { runId: string; label: string }) {
  const log = useLog(runId, label)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  return (
    <div className="bg-black rounded border border-gray-700 p-3 max-h-[30vh] overflow-y-auto font-mono text-xs text-gray-300 whitespace-pre-wrap">
      {log || <span className="text-gray-600">No log output yet...</span>}
      <div ref={bottomRef} />
    </div>
  )
}

export default function RunModal({ run, onClose }: { run: Run; onClose: () => void }) {
  const statusColor = STATUS_COLORS[run.status] || 'text-gray-400'
  const [selectedLog, setSelectedLog] = useState<string | null>(null)

  // Find the loop step: the one that has current_story set, or the first with status running/done that has stories
  const loopStep = run.steps.find(s => s.current_story) || run.steps.find(s => s.role === 'developer')

  function stepLogLabel(step: Step) {
    return `agentfarm-${run.id}-${step.id}`
  }

  function storyLogLabel(story: Story) {
    const stepId = loopStep?.id || run.steps[run.steps.length - 1]?.id || 'unknown'
    return `agentfarm-${run.id}-${stepId}-${story.id}`
  }

  function toggleLog(label: string) {
    setSelectedLog(prev => prev === label ? null : label)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-100">{run.task}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500 font-mono">{run.id.slice(0, 8)}</span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{run.workflow}</span>
                <span className={`text-xs font-medium ${statusColor}`}>{run.status}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none p-1">×</button>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span>Created: {fmt(run.created_at)}</span>
            {run.finished_at && <span>Finished: {fmt(run.finished_at)}</span>}
            <span>⏱ {duration(run.created_at, run.finished_at)}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1 truncate">
            📁 {run.repo}
          </div>
        </div>

        {/* Steps & Stories & Logs */}
        <div className="p-4 overflow-y-auto max-h-[65vh] space-y-4">
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Steps ({run.steps.filter(s => s.status === 'done').length}/{run.steps.length})</h3>
            {run.steps.map(step => {
              const label = stepLogLabel(step)
              return (
                <div key={step.id}>
                  <StepRow
                    step={step}
                    isSelected={selectedLog === label}
                    onClick={() => step.status !== 'pending' && toggleLog(label)}
                  />
                  {selectedLog === label && <LogPanel runId={run.id} label={label} />}
                </div>
              )
            })}
          </div>

          {run.plan?.stories && run.plan.stories.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Stories ({run.plan.stories.filter(s => s.status === 'done').length}/{run.plan.stories.length})</h3>
              {run.plan.stories.map(story => {
                const label = storyLogLabel(story)
                return (
                  <div key={story.id}>
                    <StoryRow
                      story={story}
                      isSelected={selectedLog === label}
                      onClick={() => toggleLog(label)}
                    />
                    {selectedLog === label && <LogPanel runId={run.id} label={label} />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
