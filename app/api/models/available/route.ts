import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { SUPPORTED_MODELS } from "@/lib/models-config";
import { resolveUserAllowedModels } from "@/lib/quota";

/**
 * GET — Return the list of models currently available in the system.
 * Aggregates supportedModels from all active SystemApiKeys,
 * filters by the current user's whitelisted allowedModels quota,
 * and enriches with metadata from SUPPORTED_MODELS config.
 *
 * Available to all authenticated users.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const allowedModels = await resolveUserAllowedModels(user);

  // Enrich with metadata from the static config, filtering by user's resolved allowed models
  const models = SUPPORTED_MODELS.filter(
    (m) => m.enabled && allowedModels.includes(m.id)
  ).map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    description: m.description,
  }));

  return Response.json({ models });
}
