import type { Step } from '../types'

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-gray-700',
  running:   'bg-blue-500 animate-pulse',
  done:      'bg-green-500',
  failed:    'bg-red-500',
  cancelled: 'bg-gray-600',
}

export default function StepBadge({ step }: { step: Step }) {
  const style = STATUS_STYLES[step.status] || 'bg-gray-700'
  const label = step.role || step.id

  return (
    <div className="group relative flex-1">
      <div className={`h-2 rounded-full ${style}`} title={`${label}: ${step.status}`} />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
        <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
          <div className="font-semibold">{label}</div>
          <div className="text-gray-400">{step.status}</div>
          {step.started_at && <div className="text-gray-500">{new Date(step.started_at).toLocaleTimeString()}</div>}
          {step.medic_action && <div className="text-yellow-400">🩺 {step.medic_action}: {step.medic_reason}</div>}
        </div>
      </div>
    </div>
  )
}