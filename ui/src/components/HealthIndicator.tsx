import { useHealth } from '../hooks/useHealth'

export default function HealthIndicator() {
  const { healthy } = useHealth(30000)

  if (healthy === null) {
    return (
      <div className="flex items-center gap-1.5" aria-label="Checking server health">
        <span className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
        <span className="text-xs text-gray-500">Checking...</span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1.5"
      role="status"
      aria-label={healthy ? 'Server is healthy' : 'Server is unhealthy'}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          healthy ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className={`text-xs ${healthy ? 'text-green-500' : 'text-red-500'}`}>
        {healthy ? 'Healthy' : 'Unhealthy'}
      </span>
    </div>
  )
}
