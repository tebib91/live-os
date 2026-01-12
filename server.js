import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeWebSocketServer } from './lib/terminal/websocket-server.ts';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.LIVEOS_HTTP_PORT || process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize WebSocket server for terminal
  try {
    initializeWebSocketServer(server);
  } catch (err) {
    console.error('Failed to initialize WebSocket server:', err);
  }

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
