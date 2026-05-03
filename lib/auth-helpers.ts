/**
 * Auth helper utilities for API routes and Server Components.
 */
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User, { type IUser } from "@/models/User";

/**
 * Get the current session. Returns null if not authenticated.
 */
export async function getServerSession() {
  return await auth();
}

/**
 * Require authentication — throws a Response with 401 if no session.
 * Use in API route handlers.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

/**
 * Get the full Mongoose User document for the current session user.
 * Returns null if not found.
 */
export async function getCurrentUser(): Promise<IUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  return user;
}

/**
 * Verify the request origin matches NEXTAUTH_URL to prevent CSRF.
 * Use on POST/PATCH/DELETE handlers.
 */
export function verifyOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const expectedOrigin = process.env.NEXTAUTH_URL;

  if (!origin || !expectedOrigin) return false;

  // Normalize: remove trailing slashes
  const normalizedOrigin = origin.replace(/\/+$/, "");
  const normalizedExpected = expectedOrigin.replace(/\/+$/, "");

  return normalizedOrigin === normalizedExpected;
}

/**
 * Returns a 403 Response for origin mismatch.
 */
export function forbiddenResponse() {
  return Response.json(
    { error: "Forbidden — origin mismatch" },
    { status: 403 }
  );
}
