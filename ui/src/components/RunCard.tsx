import type { Run } from '../types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m`
  return `${Math.floor(hours / 24)}d`
}

export default function RunCard({ run, onClick }: { run: Run; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:border-gray-500 transition-colors cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-500 font-mono">{run.id.slice(0, 8)}</span>
        <span className="text-xs text-gray-500">{timeAgo(run.created_at)}</span>
      </div>
      <p className="text-sm font-medium text-gray-200 mb-2 line-clamp-2">{run.task}</p>
      <span className={`text-xs px-2 py-0.5 rounded inline-block ${
        run.status === 'completed' ? 'bg-green-900/50 text-green-400' :
        run.status === 'running'   ? 'bg-blue-900/50 text-blue-400' :
        run.status === 'failed'    ? 'bg-red-900/50 text-red-400' :
        'bg-gray-700 text-gray-300'
      }`}>{run.status}</span>
    </div>
  )
}
