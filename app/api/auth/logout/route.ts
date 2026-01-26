import { logout } from "@/app/actions/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const result = await logout();
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false }, { status: 500 });
  } catch (error) {
    console.error("[API] logout failed:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
