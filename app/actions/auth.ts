"use server";

import { hasUsersRaw } from "@/lib/auth-utils";
import { SESSION_COOKIE_NAME, SESSION_DURATION } from "@/lib/config";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "../generated/prisma/enums";
import { ensureDefaultUmbrelStoreInstalled } from "./appstore";
import { withActionLogging } from "./logger";

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
export async function hasUsers() {
  return withActionLogging("auth:hasUsers", async () => hasUsersRaw());
}

/**
 * Register the first user (admin)
 */
export async function registerUser(
  username: string,
  pin: string,
  options?: { skipRedirect?: boolean },
): Promise<AuthResult> {
  return withActionLogging("auth:register", async () => {
    const userExists = await hasUsers();
    if (userExists) {
      return {
        success: false,
        error: "Users already exist. Registration is disabled.",
      };
    }

    if (!username || username.length < 3) {
      return { success: false, error: "Username too short" };
    }

    if (!/^\d{4}$/.test(pin)) {
      return { success: false, error: "PIN must be exactly 4 digits" };
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    const user = await prisma.user.create({
      data: { username, pin: hashedPin, role: "ADMIN" },
    });

    ensureDefaultUmbrelStoreInstalled().catch((error) =>
      console.error("[Auth] Failed to bootstrap Umbrel store:", error),
    );

    const session = await createSession(user.id);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: SESSION_DURATION / 1000,
    });

    if (options?.skipRedirect) {
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role as Role,
        },
      };
    }

    redirect("/");
  });
}

/**
 * Login with username and PIN
 */
export async function login(
  username: string,
  pin: string,
): Promise<AuthResult> {
  return withActionLogging("auth:login", async () => {
    try {
      const normalizedUsername = username.trim();
      const normalizedPin = pin.replace(/\D/g, "").slice(0, 4);

      if (!normalizedUsername || normalizedPin.length !== 4) {
        return {
          success: false,
          error: "Invalid username or PIN",
        };
      }

      const user = await prisma.user.findUnique({
        where: { username: normalizedUsername },
      });

      if (!user) {
        return {
          success: false,
          error: "Invalid username or PIN",
        };
      }

      const validPin = await bcrypt.compare(normalizedPin, user.pin);
      if (!validPin) {
        return {
          success: false,
          error: "Invalid username or PIN",
        };
      }

      const session = await createSession(user.id);
      const cookieStore = await cookies();

      const isSecure =
        process.env.NODE_ENV === "production" &&
        process.env.LIVEOS_HTTPS === "true";

      cookieStore.set(SESSION_COOKIE_NAME, session.token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: SESSION_DURATION / 1000,
        path: "/",
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
      return {
        success: false,
        error: "An error occurred during login",
      };
    }
  });
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
        error: "PIN must be exactly 4 digits",
      };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const validPin = await bcrypt.compare(pin, user.pin);
    if (!validPin) {
      return {
        success: false,
        error: "Invalid PIN",
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
    console.error("Verify PIN error:", error);
    return {
      success: false,
      error: "Failed to verify PIN",
    };
  }
}

/**
 * Logout and invalidate session
 */
export async function logout(): Promise<{ success: boolean }> {
  console.log("[Auth] logout: Starting logout process...");

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      console.log(
        `[Auth] logout: Found session token, deleting from database...`,
      );
      // Delete session from database
      await prisma.session
        .delete({
          where: { token: sessionToken },
        })
        .catch(() => {
          // Session might not exist, ignore error
          console.warn(
            "[Auth] logout: Session not found in database (already deleted?)",
          );
        });
      console.log("[Auth] logout: Session deleted from database");
    } else {
      console.log("[Auth] logout: No session token found");
    }

    // Clear cookie
    console.log("[Auth] logout: Clearing session cookie...");
    cookieStore.delete(SESSION_COOKIE_NAME);
    console.log("[Auth] logout: ✅ Logout completed successfully");

    return { success: true };
  } catch (error) {
    console.error("[Auth] logout: ❌ Error during logout:", error);
    return { success: false };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(
  sessionToken?: string,
): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = sessionToken || cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      console.log("[Auth] getCurrentUser: No session token found");
      return null;
    }

    // Find valid session
    const session = await prisma.session.findUnique({
      where: {
        token: token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      console.warn(
        "[Auth] getCurrentUser: Session not found or expired, clearing cookie",
      );
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
    console.error(
      "[Auth] getCurrentUser: ❌ Error getting current user:",
      error,
    );
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
  console.log(`[Auth] createSession: Creating session for user ID: ${userId}`);

  // Generate random token
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  console.log(
    `[Auth] createSession: Generated token, expires at: ${expiresAt.toISOString()}`,
  );

  // Clean up old sessions for this user (keep only last 5)
  console.log("[Auth] createSession: Cleaning up old sessions...");
  const oldSessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: 4,
  });

  if (oldSessions.length > 0) {
    console.log(
      `[Auth] createSession: Deleting ${oldSessions.length} old sessions`,
    );
    await prisma.session.deleteMany({
      where: {
        id: {
          in: oldSessions.map((s) => s.id),
        },
      },
    });
  } else {
    console.log("[Auth] createSession: No old sessions to clean up");
  }

  // Create new session
  console.log("[Auth] createSession: Creating new session in database...");
  const session = await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
  console.log(`[Auth] createSession: ✅ Session created - ID: ${session.id}`);

  return session;
}

/**
 * Generate a random session token
 */
function generateSessionToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
