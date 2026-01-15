/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { IncomingMessage } from 'http';
import * as pty from 'node-pty';
import { Duplex } from 'stream';
import { WebSocketServer } from 'ws';

let wss: WebSocketServer | null = null;

export function initializeWebSocketServer(server: any) {
  if (wss) {
    console.log('WebSocket server already initialized');
    return wss;
  }

  wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests
  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname === '/api/terminal') {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    }
    // Note: Don't destroy socket for other paths - let other WebSocket handlers process them
  });

  wss.on('connection', (ws) => {
    console.log('Terminal client connected');

    // Determine the shell to use
    const shell = process.env.SHELL || '/bin/bash';

    let ptyProcess: pty.IPty | null = null;
    try {
      // Spawn a shell process
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || '/home',
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        } as Record<string, string>,
      });
    } catch (error: any) {
      console.error('Terminal spawn failed:', error);
      try {
        ws.send(`\r\nTerminal unavailable: ${error?.message || 'failed to start shell'}\r\n`);
      } catch {
        // ignore send error
      }
      ws.close();
      return;
    }

    // Forward pty output to WebSocket
    ptyProcess.onData((data) => {
      try {
        ws.send(data);
      } catch (error) {
        console.error('Error sending data to client:', error);
      }
    });

    // Handle WebSocket messages
    ws.on('message', (message: Buffer) => {
      try {
        const data = message.toString();

        // Check if it's a resize message
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'resize') {
            ptyProcess.resize(parsed.cols || 80, parsed.rows || 24);
            return;
          }
        } catch (e) {
          // Not JSON, treat as regular input
        }

        // Write input to pty
        ptyProcess.write(data);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    // Handle WebSocket close
    ws.on('close', () => {
      console.log('Terminal client disconnected');
      ptyProcess.kill();
    });

    // Handle pty exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Shell process exited with code ${exitCode}, signal ${signal}`);
      ws.close();
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      ptyProcess.kill();
    });
  });

  console.log('WebSocket terminal server initialized');
  return wss;
}

export function getWebSocketServer() {
  return wss;
}
