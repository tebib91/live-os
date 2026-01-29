import os from "os";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBootInfo() {
  const uptimeSeconds = os.uptime();
  const bootTimeMs = Date.now() - uptimeSeconds * 1000;

  return { uptimeSeconds, bootTimeMs };
}

export async function GET() {
  try {
    const { uptimeSeconds, bootTimeMs } = getBootInfo();

    return NextResponse.json(
      {
        status: "ok",
        uptimeSeconds,
        bootTimeMs,
        timestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
      },
      { status: 500 },
    );
  }
}
