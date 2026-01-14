import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { hasUsers } from '@/app/actions/auth';

// Simple in-memory cache to avoid database calls on every request
let usersExistCache: { value: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute cache

// This middleware runs on every request
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Proxy] Request received: ${request.method} ${pathname}`);

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    console.log(`[Proxy] Skipping middleware for: ${pathname}`);
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/setup'];
  const isPublicRoute = publicRoutes.includes(pathname);
  console.log(`[Proxy] Path: ${pathname}, isPublicRoute: ${isPublicRoute}`);

  // Get the session token from cookies
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log(`[Proxy] All cookies received: ${allCookies.map(c => c.name).join(', ') || 'none'}`);

  const sessionToken = cookieStore.get('liveos_session')?.value;

  // Check if user is authenticated
  const isAuthenticated = !!sessionToken;
  console.log(`[Proxy] Session token exists: ${!!sessionToken}, isAuthenticated: ${isAuthenticated}`);

  // Check if users exist with caching
  let usersExist = false;
  try {
    const now = Date.now();

    // Use cache if valid
    if (usersExistCache && (now - usersExistCache.timestamp) < CACHE_DURATION) {
      usersExist = usersExistCache.value;
      console.log(`[Proxy] Using cached hasUsers result: ${usersExist}`);
    } else {
      console.log(`[Proxy] Cache miss or expired, checking database for users...`);
      // Direct import and call - no fetch needed!
      usersExist = await hasUsers();
      console.log(`[Proxy] Database check: hasUsers = ${usersExist}`);
      // Update cache
      usersExistCache = { value: usersExist, timestamp: now };
    }
  } catch (error) {
    console.error('[Proxy] Failed to check users:', error);
    // If check fails, assume setup is needed
    usersExist = false;
  }

  // Redirect logic
  if (!usersExist) {
    console.log(`[Proxy] No users exist in system`);
    // No users exist - must go to setup
    if (pathname !== '/setup') {
      console.log(`[Proxy] Redirecting to /setup from ${pathname}`);
      return NextResponse.redirect(new URL('/setup', request.url));
    }
    console.log(`[Proxy] Already on /setup, allowing access`);
  } else {
    console.log(`[Proxy] Users exist in system, checking authentication...`);
    // Users exist - check authentication
    if (!isAuthenticated && !isPublicRoute) {
      // Not authenticated and trying to access protected route
      console.log(`[Proxy] Not authenticated, redirecting to /login from ${pathname}`);
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isAuthenticated && isPublicRoute) {
      // Authenticated users shouldn't access login/setup
      console.log(`[Proxy] Already authenticated, redirecting to / from ${pathname}`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    console.log(`[Proxy] Authentication check passed for ${pathname}`);
  }

  console.log(`[Proxy] Allowing request to proceed: ${pathname}`);
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
