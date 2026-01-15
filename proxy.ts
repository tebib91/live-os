import { getCurrentUser } from '@/app/actions/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from './lib/config';

// This middleware runs on every request
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/setup'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Check if user is authenticated by validating the session
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const currentUser = await getCurrentUser(sessionToken);
  const isAuthenticated = currentUser !== null;

  // Redirect unauthenticated users to login (except for public routes)
  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from login/setup pages
  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|wallpapers).*)',
  ],
};
