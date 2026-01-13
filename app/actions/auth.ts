'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { Role } from '../generated/prisma/enums';

const SESSION_COOKIE_NAME = 'liveos_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}

/**
 * Check if any users exist in the system
 */
export async function hasUsers(): Promise<boolean> {
  try {
    const count = await prisma.user.count();
    return count > 0;
  } catch (error) {
    // If database/table doesn't exist, return false (no users)
    console.error('hasUsers error (database may not be initialized):', error);
    return false;
  }
}

/**
 * Register the first user (admin)
 */
export async function registerUser(
  username: string,
  pin: string
): Promise<AuthResult> {
  try {
    // Check if users already exist
    const userExists = await hasUsers();
    if (userExists) {
      console.info('[auth] registerUser blocked: users already exist');
      return {
        success: false,
        error: 'Users already exist. Registration is disabled.',
      };
    }

    // Validate input
    if (!username || username.length < 3) {
      console.warn('[auth] registerUser validation failed: username too short');
      return {
        success: false,
        error: 'Username must be at least 3 characters long',
      };
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      console.warn('[auth] registerUser validation failed: invalid PIN format');
      return {
        success: false,
        error: 'PIN must be exactly 4 digits',
      };
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        pin: hashedPin,
        role: 'ADMIN',
      },
    });

    // Create session
    const session = await createSession(user.id);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('[auth] registerUser error:', error);
    return {
      success: false,
      error: 'An error occurred during registration',
    };
  }
}

/**
 * Login with username and PIN
 */
export async function login(
  username: string,
  pin: string
): Promise<AuthResult> {
  try {
    const normalizedUsername = username.trim();
    const normalizedPin = pin.replace(/\D/g, '').slice(0, 4);

    if (!normalizedUsername || normalizedPin.length !== 4) {
      console.warn('[auth] login validation failed: invalid input', {
        username: normalizedUsername,
        pinLength: normalizedPin.length,
      });
      return {
        success: false,
        error: 'Invalid username or PIN',
      };
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user) {
      console.warn('[auth] login failed: user not found', { username: normalizedUsername });
      return {
        success: false,
        error: 'Invalid username or PIN',
      };
    }

    // Verify PIN
    const validPin = await bcrypt.compare(normalizedPin, user.pin);
    if (!validPin) {
      console.warn('[auth] login failed: invalid PIN', { username: normalizedUsername });
      return {
        success: false,
        error: 'Invalid username or PIN',
      };
    }

    // Create session
    const session = await createSession(user.id);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('[auth] login error:', error);
    return {
      success: false,
      error: 'An error occurred during login',
    };
  }
}

/**
 * Verify the current user's PIN without creating a new session
 */
export async function verifyPin(pin: string): Promise<AuthResult> {
  try {
    // Validate input early to avoid unnecessary database lookups
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return {
        success: false,
        error: 'PIN must be exactly 4 digits',
      };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const validPin = await bcrypt.compare(pin, user.pin);
    if (!validPin) {
      return {
        success: false,
        error: 'Invalid PIN',
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('Verify PIN error:', error);
    return {
      success: false,
      error: 'Failed to verify PIN',
    };
  }
}

/**
 * Logout and invalidate session
 */
export async function logout(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      // Delete session from database
      await prisma.session.delete({
        where: { token: sessionToken },
      }).catch(() => {
        // Session might not exist, ignore error
      });
    }

    // Clear cookie
    cookieStore.delete(SESSION_COOKIE_NAME);

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return null;
    }

    // Find valid session
    const session = await prisma.session.findUnique({
      where: {
        token: sessionToken,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      // Clear invalid cookie
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    return {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Verify if session is valid
 */
export async function verifySession(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Create a new session for a user
 */
async function createSession(userId: string) {
  // Generate random token
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  // Clean up old sessions for this user (keep only last 5)
  const oldSessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: 4,
  });

  if (oldSessions.length > 0) {
    await prisma.session.deleteMany({
      where: {
        id: {
          in: oldSessions.map((s) => s.id),
        },
      },
    });
  }

  // Create new session
  return prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
}

/**
 * Generate a random session token
 */
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
