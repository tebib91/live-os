import { Server as IOServer } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import type { NextApiResponse } from 'next'

let io: IOServer | null = null

export function initSocket(res: NextApiResponse) {
  if (!res.socket) throw new Error('No socket found')
  if (io) return io
  io = new IOServer(res.socket.server as HTTPServer, {
    path: '/api/socket/io'
  })
  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}
