import { spawn } from "child_process";

export const dynamic = "force-dynamic";

/**
 * SSE endpoint for streaming Docker container logs in real-time.
 * Usage: GET /api/docker/logs?container=<name>
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const container = url.searchParams.get("container");

  if (!container || /[^a-zA-Z0-9_.-]/.test(container)) {
    return new Response("Invalid container name", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const proc = spawn("docker", [
        "logs",
        "--tail",
        "100",
        "--follow",
        "--timestamps",
        container,
      ]);

      const sendLine = (data: Buffer) => {
        const lines = data.toString("utf-8").split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ line })}\n\n`),
            );
          } catch {
            // Controller closed
            proc.kill();
          }
        }
      };

      proc.stdout.on("data", sendLine);
      proc.stderr.on("data", sendLine);

      proc.on("close", () => {
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        proc.kill();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
