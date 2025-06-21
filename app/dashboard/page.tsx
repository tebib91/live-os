'use client'
import useStats from '@/hooks/useStats'

export default function Dashboard() {
  const { cpu, mem } = useStats()
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">System Stats</h1>
      <div className="flex flex-col gap-2">
        <div>CPU: {cpu}%</div>
        <div>Memory: {mem}%</div>
      </div>
    </div>
  )
}
