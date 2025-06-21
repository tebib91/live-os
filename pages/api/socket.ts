import { NextApiRequest, NextApiResponse } from 'next'
import { Server } from 'socket.io'

export const config = {
  api: {
    bodyParser: false
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket) {
    res.status(500).end()
    return
  }
  if (!(res.socket as any).server.io) {
    const io = new Server(res.socket.server)
    ;(res.socket as any).server.io = io
    io.on('connection', socket => {
      console.log('socket connected')
    })
  }
  res.end()
}
