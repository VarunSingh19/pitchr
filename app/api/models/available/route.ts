import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import SystemApiKey from "@/models/SystemApiKey";
import { SUPPORTED_MODELS } from "@/lib/models-config";

/**
 * GET — Return the list of models currently available in the system.
 * Aggregates supportedModels from all active SystemApiKeys,
 * then enriches with metadata from SUPPORTED_MODELS config.
 *
 * Available to all authenticated users.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  // Get the distinct set of model IDs supported by active, non-rate-limited keys
  const now = new Date();
  const activeKeys = await SystemApiKey.find({
    isActive: true,
    $or: [
      { rateLimitedUntil: null },
      { rateLimitedUntil: { $lte: now } },
    ],
  })
    .select("supportedModels")
    .lean();

  // Aggregate unique model IDs
  const availableModelIds = new Set<string>();
  for (const key of activeKeys) {
    for (const modelId of key.supportedModels) {
      availableModelIds.add(modelId);
    }
  }

  // Enrich with metadata from the static config
  const models = SUPPORTED_MODELS.filter(
    (m) => m.enabled && availableModelIds.has(m.id)
  ).map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    description: m.description,
  }));

  return Response.json({ models });
}
