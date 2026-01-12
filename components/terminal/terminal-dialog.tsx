'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Terminal } from 'xterm';
import type { FitAddon } from 'xterm-addon-fit';
import type { WebLinksAddon } from 'xterm-addon-web-links';

interface TerminalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TerminalDialog({ open, onOpenChange }: TerminalDialogProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!open || !terminalRef.current) return;

    let term: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let webLinksAddon: WebLinksAddon | null = null;
    let ws: WebSocket | null = null;

    // Dynamically import and initialize xterm to avoid SSR issues
    const initTerminal = async () => {
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');
      const { WebLinksAddon } = await import('xterm-addon-web-links');

      // Initialize xterm.js
      term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#00ff00',
        cursor: '#00ff00',
        cursorAccent: '#000000',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#bfbfbf',
        brightBlack: '#4d4d4d',
        brightRed: '#ff6e67',
        brightGreen: '#5af78e',
        brightYellow: '#f4f99d',
        brightBlue: '#caa9fa',
        brightMagenta: '#ff92d0',
        brightCyan: '#9aedfe',
        brightWhite: '#e6e6e6',
      },
        cols: 80,
        rows: 24,
      });

      // Initialize addons
      fitAddon = new FitAddon();
      webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      // Open terminal in the DOM
      if (terminalRef.current) {
        term.open(terminalRef.current);
        fitAddon.fit();
      }

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Connect to WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/api/terminal`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Terminal WebSocket connected');
        term?.writeln('\x1b[1;32mConnected to server terminal\x1b[0m');
        term?.writeln('');
      };

      ws.onmessage = (event) => {
        term?.write(event.data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        term?.writeln('\x1b[1;31mConnection error\x1b[0m');
      };

      ws.onclose = () => {
        console.log('Terminal WebSocket disconnected');
        term?.writeln('');
        term?.writeln('\x1b[1;31mDisconnected from server\x1b[0m');
      };

      // Handle terminal input
      term.onData((data) => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Handle window resize
      const handleResize = () => {
        fitAddon?.fit();
        if (ws?.readyState === WebSocket.OPEN && term) {
          ws.send(JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows,
          }));
        }
      };

      window.addEventListener('resize', handleResize);

      // Store cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        ws?.close();
        term?.dispose();
      };
    };

    // Initialize terminal
    initTerminal().catch((error) => {
      console.error('Failed to initialize terminal:', error);
    });

    // Cleanup on unmount
    return () => {
      ws?.close();
      term?.dispose();
    };
  }, [open]);

  // Handle maximize/minimize
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`${
          isMaximized
            ? 'max-w-[98vw] max-h-[98vh]'
            : 'max-w-[95vw] sm:max-w-[1200px] max-h-[90vh]'
        } bg-black border-zinc-800 shadow-2xl p-0 gap-0 overflow-hidden transition-all`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <h2 className="text-lg font-bold text-white/90 -tracking-[0.01em]">Terminal</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMaximize}
              className="h-8 w-8 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90"
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Terminal Container */}
        <div
          ref={terminalRef}
          className={`${
            isMaximized ? 'h-[calc(98vh-64px)]' : 'h-[calc(90vh-64px)]'
          } w-full bg-black p-4`}
          style={{ overflow: 'hidden' }}
        />
      </DialogContent>
    </Dialog>
  );
}
