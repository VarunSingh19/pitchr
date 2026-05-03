import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { verifyOrigin, forbiddenResponse } from "@/lib/auth-helpers";
import { GoogleGenerativeAI } from "@google/generative-ai";

/** GET — List user's API keys (masked) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    return Response.json({ keys: [] });
  }

  // Return masked keys — NEVER return decrypted values
  const keys = (user.apiKeys || []).map((k: { _id: unknown; provider: string; label: string; key: string; isDefault: boolean; addedAt: Date }) => ({
    _id: k._id,
    provider: k.provider,
    label: k.label,
    maskedKey: maskKey(k.key),
    isDefault: k.isDefault,
    addedAt: k.addedAt,
  }));

  return Response.json({ keys });
}

/** POST — Add a new API key (validates with Gemini test call) */
export async function POST(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider, key, label, isDefault } = await request.json();

  if (!key || typeof key !== "string") {
    return Response.json({ error: "API key is required" }, { status: 400 });
  }

  // Validate the key by making a test call
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    await model.generateContent("Say hello in one word.");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Invalid API key: ${msg}` },
      { status: 400 }
    );
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // If setting as default, unset all others
  if (isDefault) {
    for (const k of user.apiKeys) {
      k.isDefault = false;
    }
  }

  // If this is the first key, make it default
  const shouldBeDefault = isDefault || user.apiKeys.length === 0;

  user.apiKeys.push({
    provider: provider || "gemini",
    key, // Will be encrypted by pre-save hook
    label: label || "",
    isDefault: shouldBeDefault,
    addedAt: new Date(),
  });

  await user.save();

  return Response.json({ success: true });
}

/** DELETE — Remove an API key */
export async function DELETE(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyId } = await request.json();

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  user.apiKeys = user.apiKeys.filter(
    (k: { _id: { toString: () => string } }) => k._id.toString() !== keyId
  );

  // If we removed the default, make the first remaining key default
  if (user.apiKeys.length > 0 && !user.apiKeys.some((k: { isDefault: boolean }) => k.isDefault)) {
    user.apiKeys[0].isDefault = true;
  }

  await user.save();

  return Response.json({ success: true });
}

/** PATCH — Update a key (set default, update label) */
export async function PATCH(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyId, isDefault, label } = await request.json();

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  for (const k of user.apiKeys) {
    if (k._id.toString() === keyId) {
      if (label !== undefined) k.label = label;
      if (isDefault) k.isDefault = true;
    } else if (isDefault) {
      k.isDefault = false;
    }
  }

  await user.save();

  return Response.json({ success: true });
}

/** Mask an encrypted key for display */
function maskKey(encryptedKey: string): string {
  // The encrypted key is hex-encoded, so just show first/last chars
  if (encryptedKey.length > 12) {
    return encryptedKey.slice(0, 6) + "••••••" + encryptedKey.slice(-4);
  }
  return "••••••••";
}
