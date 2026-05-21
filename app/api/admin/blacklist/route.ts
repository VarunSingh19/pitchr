import { requireAdmin } from "@/lib/admin-auth";
import { dbConnect } from "@/lib/db";
import { verifyOrigin, forbiddenResponse } from "@/lib/auth-helpers";
import SystemBlacklist from "@/models/SystemBlacklist";

export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  await dbConnect();

  try {
    const items = await SystemBlacklist.find().sort({ createdAt: -1 }).lean();
    return Response.json({ blacklist: items });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch blacklist" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  let session;
  try {
    session = await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  try {
    const { domainOrEmail, reason } = await request.json();

    if (!domainOrEmail || typeof domainOrEmail !== "string" || !domainOrEmail.trim()) {
      return Response.json({ error: "domainOrEmail is required" }, { status: 400 });
    }

    await dbConnect();

    // Check if already exists
    const normalized = domainOrEmail.trim().toLowerCase();
    const existing = await SystemBlacklist.findOne({ domainOrEmail: normalized });
    if (existing) {
      return Response.json({ error: "Domain or email already blacklisted" }, { status: 409 });
    }

    const newItem = await SystemBlacklist.create({
      domainOrEmail: normalized,
      addedBy: session.user?.email || "admin",
      reason: reason || "",
    });

    return Response.json({ success: true, item: newItem });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to add to blacklist" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "id parameter is required" }, { status: 400 });
    }

    await dbConnect();

    const deleted = await SystemBlacklist.findByIdAndDelete(id);
    if (!deleted) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to delete from blacklist" },
      { status: 500 }
    );
  }
}
