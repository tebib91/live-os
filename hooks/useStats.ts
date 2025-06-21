import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

type Stats = { cpu: number; mem: number }

export default function useStats() {
  const [stats, setStats] = useState<Stats>({ cpu: 0, mem: 0 })

  useEffect(() => {
    const socket: Socket = io('/api/socket')
    socket.on('stats', data => setStats(data))
    return () => {
      socket.disconnect()
    }
  }, [])

  return stats
}
