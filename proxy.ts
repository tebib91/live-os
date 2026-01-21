import { getCurrentUser } from "@/app/actions/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasUsersRaw } from "./lib/auth-utils";
import { SESSION_COOKIE_NAME } from "./lib/config";

const publicRoutes = ["/login", "/setup"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const currentUser = sessionToken ? await getCurrentUser(sessionToken) : null;
  const isAuthenticated = currentUser !== null;
  const isPublicRoute = publicRoutes.includes(pathname);

  const hasAnyUsers = await hasUsersRaw();

  // If no users exist yet, force setup for all routes
  if (!hasAnyUsers && pathname !== "/setup") {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  // Users exist: block setup screen
  if (hasAnyUsers && pathname === "/setup") {
    const destination = isAuthenticated ? "/" : "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Auth guard for the rest of the app
  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect logged-in users away from login
  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*|wallpapers).*)"],
};
