import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'liveos_session';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/setup'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Check if user has a session token
  const hasSession = !!sessionToken;

  // If accessing public route with session, redirect to home
  if (isPublicRoute && hasSession) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If accessing protected route without session, redirect to login
  if (!isPublicRoute && !hasSession) {
    // First check if any users exist by trying to access setup
    // This is handled by the setup page itself, so just redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|wallpapers|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$).*)',
  ],
};
