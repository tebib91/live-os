import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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

  // Get the session token from cookies
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('liveos_session')?.value;
console.log('Middleware: Session Token:', sessionToken);
  // Check if user is authenticated
  const isAuthenticated = !!sessionToken;

  // Check if users exist by making a request to the auth action
  // We'll use a simple in-memory cache to avoid database calls on every request
  let hasUsers = false;
  try {
    // We need to check if users exist
    // This is a simplified check - you might want to add caching
    const response = await fetch(`${request.nextUrl.origin}/api/auth/check-users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      hasUsers = data.hasUsers;
    }
  } catch (error) {
    console.error('Middleware: Failed to check users:', error);
    // If check fails, assume setup is needed
    hasUsers = false;
  }

  // Redirect logic
  if (!hasUsers) {
    // No users exist - must go to setup
    if (pathname !== '/setup') {
      return NextResponse.redirect(new URL('/setup', request.url));
    }
  } else {
    // Users exist - check authentication
    if (!isAuthenticated && !isPublicRoute) {
      // Not authenticated and trying to access protected route
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isAuthenticated && isPublicRoute) {
      // Authenticated users shouldn't access login/setup
      return NextResponse.redirect(new URL('/', request.url));
    }
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
