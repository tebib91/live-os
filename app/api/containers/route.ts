import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

function execPromise(cmd: string) {
  return new Promise<string>((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr)
      resolve(stdout)
    })
  })
}

export async function POST(req: NextRequest) {
  const { action, name } = await req.json()

  if (!['start', 'stop', 'restart'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  try {
    await execPromise(`docker ${action} ${name}`)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Command failed' }, { status: 500 })
  }
}
