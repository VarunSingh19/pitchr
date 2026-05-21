import { requireAdmin } from "@/lib/admin-auth";
import { dbConnect } from "@/lib/db";
import { verifyOrigin, forbiddenResponse } from "@/lib/auth-helpers";
import SystemApiKey from "@/models/SystemApiKey";
import { encrypt, isEncrypted } from "@/lib/encryption";

/** GET — List all system API keys (masked) */
export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  await dbConnect();
  const keys = await SystemApiKey.find().sort({ createdAt: -1 }).lean();

  // Mask keys before sending to client
  const masked = keys.map((k) => ({
    _id: k._id,
    provider: k.provider,
    label: k.label,
    maskedKey: maskKey(k.key),
    supportedModels: k.supportedModels,
    isActive: k.isActive,
    usageCount: k.usageCount,
    lastUsedAt: k.lastUsedAt,
    rateLimitedUntil: k.rateLimitedUntil,
    consecutiveFailures: k.consecutiveFailures ?? 0,
    averageLatencyMs: k.averageLatencyMs ?? 0,
    lastError: k.lastError ?? "",
    latencyHistory: k.latencyHistory ?? [],
    createdAt: k.createdAt,
  }));

  return Response.json({ keys: masked });
}

/** POST — Add a new system API key */
export async function POST(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { provider, key, label, supportedModels } = await request.json();

  if (!key || typeof key !== "string") {
    return Response.json({ error: "API key is required" }, { status: 400 });
  }

  if (!provider) {
    return Response.json({ error: "Provider is required" }, { status: 400 });
  }

  if (!supportedModels || !Array.isArray(supportedModels) || supportedModels.length === 0) {
    return Response.json(
      { error: "At least one supported model is required" },
      { status: 400 }
    );
  }

  // Validate the key with a lightweight API call
  try {
    let validateRes: Response;

    if (provider === "nvidia") {
      validateRes = await fetch("https://integrate.api.nvidia.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
      });
    } else {
      // Gemini: validate via models list
      validateRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        { method: "GET" }
      );
    }

    if (!validateRes.ok) {
      const data = await validateRes.json().catch(() => ({}));
      const msg = data?.error?.message || `HTTP ${validateRes.status}`;
      return Response.json(
        { error: `Invalid API key: ${msg}` },
        { status: 400 }
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Failed to validate key: ${msg}` },
      { status: 400 }
    );
  }

  await dbConnect();

  const newKey = new SystemApiKey({
    provider,
    key, // Will be encrypted by pre-save hook
    label: label || "",
    supportedModels,
  });

  await newKey.save();

  return Response.json({ success: true, id: newKey._id });
}

/** PATCH — Update a system API key (toggle active, update label/models, reset health) */
export async function PATCH(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { keyId, isActive, label, supportedModels, resetHealth } = await request.json();

  if (!keyId) {
    return Response.json({ error: "keyId is required" }, { status: 400 });
  }

  await dbConnect();

  const updateFields: Record<string, unknown> = {};
  if (isActive !== undefined) updateFields.isActive = isActive;
  if (label !== undefined) updateFields.label = label;
  if (supportedModels !== undefined) updateFields.supportedModels = supportedModels;

  // If reactivating, clear rate limit
  if (isActive === true) {
    updateFields.rateLimitedUntil = null;
  }

  if (resetHealth === true) {
    updateFields.consecutiveFailures = 0;
    updateFields.averageLatencyMs = 0;
    updateFields.lastError = "";
    updateFields.latencyHistory = [];
    updateFields.rateLimitedUntil = null;
  }

  const updated = await SystemApiKey.findByIdAndUpdate(
    keyId,
    { $set: updateFields },
    { returnDocument: "after" }
  );

  if (!updated) {
    return Response.json({ error: "Key not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

/** DELETE — Remove a system API key */
export async function DELETE(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { keyId } = await request.json();

  if (!keyId) {
    return Response.json({ error: "keyId is required" }, { status: 400 });
  }

  await dbConnect();

  const deleted = await SystemApiKey.findByIdAndDelete(keyId);

  if (!deleted) {
    return Response.json({ error: "Key not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

/** Mask an encrypted key for display */
function maskKey(encryptedKey: string): string {
  if (encryptedKey.length > 12) {
    return encryptedKey.slice(0, 6) + "••••••" + encryptedKey.slice(-4);
  }
  return "••••••••";
}
