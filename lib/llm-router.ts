/**
 * LLM Router — Intelligent API key pool with LRU selection.
 *
 * Uses atomic findOneAndUpdate to select the least-recently-used key
 * that supports the requested model. This prevents race conditions
 * where two simultaneous requests pick the same key.
 *
 * Usage:
 *   const { key, keyId, provider } = await getAvailableKey("gemini-2.5-flash");
 *   // ... use `key` (decrypted) for the API call
 *   // On 429 error:
 *   await markRateLimited(keyId, 60_000);
 */

import { dbConnect } from "@/lib/db";
import SystemApiKey from "@/models/SystemApiKey";
import { decrypt } from "@/lib/encryption";
import { getProviderForModel } from "@/lib/models-config";

export interface PooledKey {
  key: string;       // Decrypted plaintext API key
  keyId: string;     // MongoDB _id of the SystemApiKey document
  provider: string;  // gemini | nvidia | claude
  modelId: string;   // The model that was requested
}

/**
 * Get an available API key for the given model using LRU selection.
 *
 * Atomically selects the active key with the oldest `lastUsedAt` that
 * supports the requested model, and updates `lastUsedAt` + increments
 * `usageCount` in a single DB operation. This prevents two concurrent
 * requests from picking the same key.
 *
 * @throws {Response} 503 if no key is available (all rate-limited or none configured)
 */
export async function getAvailableKey(modelId: string): Promise<PooledKey> {
  await dbConnect();

  const now = new Date();

  const key = await SystemApiKey.findOneAndUpdate(
    {
      isActive: true,
      supportedModels: modelId,
      $or: [
        { rateLimitedUntil: null },
        { rateLimitedUntil: { $lte: now } },
      ],
    },
    {
      $set: { lastUsedAt: now },
      $inc: { usageCount: 1 },
    },
    {
      sort: { lastUsedAt: 1 }, // LRU: pick the key used longest ago
      returnDocument: "after",  // return the updated document
    }
  );

  if (!key) {
    console.warn(
      `[llm-router] No available key for model "${modelId}". All keys may be rate-limited or none are configured.`
    );
    const err = new Error(
      "AI service temporarily unavailable — all keys rate-limited"
    );
    (err as any).status = 503;
    throw err;
  }

  const provider = getProviderForModel(modelId) || key.provider;

  return {
    key: decrypt(key.key),
    keyId: key._id.toString(),
    provider,
    modelId,
  };
}

/**
 * Mark a key as rate-limited for a specified duration.
 * Called when a 429 response is received from the AI provider.
 *
 * @param keyId - MongoDB _id of the SystemApiKey
 * @param retryAfterMs - How long to sideline the key (default: 60 seconds)
 */
export async function markRateLimited(
  keyId: string,
  retryAfterMs: number = 60_000
): Promise<void> {
  await dbConnect();

  const rateLimitedUntil = new Date(Date.now() + retryAfterMs);

  await SystemApiKey.findByIdAndUpdate(keyId, {
    $set: { rateLimitedUntil },
  });

  console.warn(
    `[llm-router] Key ${keyId} rate-limited until ${rateLimitedUntil.toISOString()}`
  );
}
