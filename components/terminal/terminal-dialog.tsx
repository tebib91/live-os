"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { ChevronDown, Container, Server, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Terminal } from "xterm";
import type { FitAddon } from "xterm-addon-fit";
import type { WebLinksAddon } from "xterm-addon-web-links";

interface TerminalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TerminalDialog({ open, onOpenChange }: TerminalDialogProps) {
  const { installedApps } = useSystemStatus({ fast: true });
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string>("host");

  const targets = useMemo(() => {
    const hostTarget = {
      id: "host",
      label: "LiveOS Host",
      badge: "OS",
      icon: <Server className="h-4 w-4 text-emerald-300" />,
    };

    const dockerTargets =
      installedApps
        ?.filter((app) => app.status === "running")
        .map((app) => ({
          id: app.containerName,
          label: app.name,
          badge: "Docker",
          icon: <Container className="h-4 w-4 text-sky-300" />,
        })) ?? [];

    return [hostTarget, ...dockerTargets];
  }, [installedApps]);

  const activeTarget = targets.find((t) => t.id === targetId) ?? targets[0];

  useEffect(() => {
    if (!open) return;

    let term: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let webLinksAddon: WebLinksAddon | null = null;
    let ws: WebSocket | null = null;
    let resizeHandler: (() => void) | null = null;
    let rafId: number | null = null;

    // Dynamically import and initialize xterm to avoid SSR issues
    const initTerminal = async () => {
      const container = terminalRef.current;
      if (!container) {
        rafId = requestAnimationFrame(initTerminal);
        return;
      }

      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      const { WebLinksAddon } = await import("xterm-addon-web-links");

      // Initialize xterm.js
      term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#000000",
          foreground: "#00ff00",
          cursor: "#00ff00",
          cursorAccent: "#000000",
          black: "#000000",
          red: "#ff5555",
          green: "#50fa7b",
          yellow: "#f1fa8c",
          blue: "#bd93f9",
          magenta: "#ff79c6",
          cyan: "#8be9fd",
          white: "#bfbfbf",
          brightBlack: "#4d4d4d",
          brightRed: "#ff6e67",
          brightGreen: "#5af78e",
          brightYellow: "#f4f99d",
          brightBlue: "#caa9fa",
          brightMagenta: "#ff92d0",
          brightCyan: "#9aedfe",
          brightWhite: "#e6e6e6",
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
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/api/terminal`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatusMessage(null);
        term?.writeln("\x1b[1;32mConnected to server terminal\x1b[0m");
        if (activeTarget?.id && activeTarget.id !== "host") {
          term?.writeln(
            `\x1b[1;34mAttaching to ${activeTarget.label} (docker exec -it ${activeTarget.id})\x1b[0m`,
          );
          ws!.send(`docker exec -it ${activeTarget.id} /bin/sh\n`);
        }
        term?.writeln("");
      };

      ws.onmessage = (event) => {
        if (
          typeof event.data === "string" &&
          event.data.includes("Terminal unavailable")
        ) {
          setStatusMessage(event.data.toString());
        }
        term?.write(event.data);
      };

      ws.onerror = () => {
        setStatusMessage(
          "Connection error. Ensure node-pty is installed on the server.",
        );
        term?.writeln("\x1b[1;31mConnection error\x1b[0m");
      };

      ws.onclose = () => {
        setStatusMessage(
          (prev) =>
            prev ||
            "Terminal disconnected. If this persists, rebuild node-pty on the server.",
        );
        term?.writeln("");
        term?.writeln("\x1b[1;31mDisconnected from server\x1b[0m");
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
          ws.send(
            JSON.stringify({
              type: "resize",
              cols: term.cols,
              rows: term.rows,
            }),
          );
        }
      };

      window.addEventListener("resize", handleResize);
      resizeHandler = handleResize;

      // Store cleanup function
    };

    // Initialize terminal
    initTerminal().catch(() => {
      setStatusMessage("Failed to initialize terminal.");
    });

    // Cleanup on unmount
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }
      ws?.close();
      term?.dispose();
    };
  }, [open, activeTarget?.id, activeTarget?.label]);

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
            ? "max-w-[98vw] max-h-[98vh]"
            : "max-w-[95vw] sm:max-w-[1200px] max-h-[90vh]"
        } bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden ring-1 ring-white/5 transition-all`}
        aria-describedby="terminal-description"
      >
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur">
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
              Terminal
            </span>
            <DialogTitle className="sr-only text-3xl font-semibold text-white drop-shadow">
              Terminal
            </DialogTitle>
            <DialogDescription id="terminal-description" className="sr-only">
              Interactive terminal for executing shell commands
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 rounded-full border border-white/15 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white px-3 flex items-center gap-2"
                >
                  {activeTarget?.icon}
                  <span className="text-xs font-medium truncate max-w-[120px]">
                    {activeTarget?.label || "Select"}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[220px] bg-white/10 border-white/10 backdrop-blur-xl text-white"
              >
                <DropdownMenuLabel className="text-white/80">
                  Connect to
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setTargetId("host");
                    setStatusMessage(null);
                  }}
                  className="flex items-center gap-2 text-white/90"
                >
                  <Server className="h-4 w-4 text-emerald-300" />
                  <span>LiveOS Host Shell</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                {targets.filter((t) => t.id !== "host").length === 0 && (
                  <DropdownMenuItem disabled className="text-white/50">
                    No running Docker apps
                  </DropdownMenuItem>
                )}
                {targets
                  .filter((t) => t.id !== "host")
                  .map((target) => (
                    <DropdownMenuItem
                      key={target.id}
                      onSelect={(event) => {
                        event.preventDefault();
                        setTargetId(target.id);
                        setStatusMessage(`Connecting to ${target.label}...`);
                      }}
                      className="flex items-center gap-2 text-white/90"
                    >
                      <Container className="h-4 w-4 text-sky-300" />
                      <div className="flex flex-col">
                        <span>{target.label}</span>
                        <span className="text-[11px] text-white/60">
                          docker exec
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* <Button
              variant="ghost"
              size="icon"
              onClick={toggleMaximize}
              className="h-10 w-10 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button> */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Terminal Container */}
        <div
          ref={terminalRef}
          className={`${
            isMaximized ? "h-[calc(98vh-64px)]" : "h-[calc(90vh-64px)]"
          } w-full bg-black/70 p-4 backdrop-blur-xl`}
          style={{ overflow: "hidden" }}
        />
        {statusMessage && (
          <div className="px-4 py-2 text-xs text-amber-300 bg-amber-950/40 border-t border-amber-800">
            {statusMessage}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
