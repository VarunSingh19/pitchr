/**
 * Admin-specific auth helpers.
 * Provides reusable functions for checking admin role in API routes & Server Components.
 */
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

/**
 * Require the current user to be an admin. Throws a 403 Response if not.
 * Use this at the top of admin API route handlers.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If impersonating, the real user is verified as admin
  if ((session as any).isImpersonating) {
    return session;
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email }).select("role").lean();

  if (!user || user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden — admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return session;
}

/**
 * Check if the current session user is an admin.
 * Returns true/false — use in Server Components for conditional rendering.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) return false;

  if ((session as any).isImpersonating) return true;

  await dbConnect();
  const user = await User.findOne({ email: session.user.email }).select("role").lean();
  return user?.role === "admin";
}

/**
 * Auto-promote the ADMIN_EMAIL user to admin on server start.
 * Called once during app initialization.
 */
export async function autoPromoteAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  try {
    await dbConnect();
    const result = await User.findOneAndUpdate(
      { email: adminEmail, role: "user" },
      { $set: { role: "admin" } },
      { returnDocument: "after" }
    );

    if (result) {
      console.log(`[admin-auth] Auto-promoted ${adminEmail} to admin.`);
    }
  } catch (error) {
    console.warn("[admin-auth] Failed to auto-promote admin:", error);
  }
}
