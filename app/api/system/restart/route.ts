import { restartSystem } from "@/app/actions/system";
import { NextResponse } from "next/server";

export async function POST() {
  const result = await restartSystem();
  if (result.success) {
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false, error: result.error }, { status: 500 });
}
