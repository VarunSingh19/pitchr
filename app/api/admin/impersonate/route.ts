import { requireAdmin } from "@/lib/admin-auth";
import { dbConnect } from "@/lib/db";
import { verifyOrigin, forbiddenResponse } from "@/lib/auth-helpers";
import User from "@/models/User";
import { cookies } from "next/headers";

/**
 * POST /api/admin/impersonate
 * Start impersonating a user. Sets the secure impersonation cookie.
 */
export async function POST(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    // Requires that the real logged-in user is an admin
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  try {
    const { userId } = await request.json();

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(userId);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "admin") {
      return Response.json(
        { error: "Cannot impersonate other admin accounts" },
        { status: 400 }
      );
    }

    // Set the cookie
    const cookieStore = await cookies();
    cookieStore.set("impersonate_user_id", userId, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 2, // 2 hours
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to impersonate" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/impersonate
 * Stop impersonation. Clears the impersonation cookie.
 */
export async function DELETE(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    // Requires real admin session (requireAdmin bypasses for impersonation, but checks token first)
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  try {
    const cookieStore = await cookies();
    cookieStore.delete("impersonate_user_id");

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to stop impersonation" },
      { status: 500 }
    );
  }
}
