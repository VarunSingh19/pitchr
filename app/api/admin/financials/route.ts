import { requireAdmin } from "@/lib/admin-auth";
import { dbConnect } from "@/lib/db";
import AiTokenLog from "@/models/AiTokenLog";
import SystemApiKey from "@/models/SystemApiKey";

export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  await dbConnect();

  try {
    // 1. Overall aggregated statistics
    const totalStats = await AiTokenLog.aggregate([
      {
        $group: {
          _id: null,
          totalSpend: { $sum: "$costUsd" },
          totalTokens: { $sum: "$totalTokens" },
          promptTokens: { $sum: "$promptTokens" },
          completionTokens: { $sum: "$completionTokens" },
          totalCalls: { $sum: 1 },
          successCalls: {
            $sum: { $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0] },
          },
          failedCalls: {
            $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
          },
        },
      },
    ]);

    const totals = totalStats[0] || {
      totalSpend: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
    };

    // Remove _id from totals
    delete totals._id;

    // 2. Statistics grouped by Model
    const byModel = await AiTokenLog.aggregate([
      {
        $group: {
          _id: { modelId: "$modelId", provider: "$provider" },
          totalSpend: { $sum: "$costUsd" },
          totalTokens: { $sum: "$totalTokens" },
          promptTokens: { $sum: "$promptTokens" },
          completionTokens: { $sum: "$completionTokens" },
          totalCalls: { $sum: 1 },
          successCalls: {
            $sum: { $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0] },
          },
          failedCalls: {
            $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          modelId: "$_id.modelId",
          provider: "$_id.provider",
          totalSpend: 1,
          totalTokens: 1,
          promptTokens: 1,
          completionTokens: 1,
          totalCalls: 1,
          successCalls: 1,
          failedCalls: 1,
        },
      },
      { $sort: { totalSpend: -1 } },
    ]);

    // 3. Daily spend for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySpend = await AiTokenLog.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          spend: { $sum: "$costUsd" },
          calls: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          spend: 1,
          calls: 1,
        },
      },
    ]);

    // 4. Fetch all keys status (masked)
    const keys = await SystemApiKey.find().sort({ createdAt: -1 }).lean();
    
    const maskKey = (encryptedKey: string): string => {
      if (encryptedKey && encryptedKey.length > 12) {
        return encryptedKey.slice(0, 6) + "••••••" + encryptedKey.slice(-4);
      }
      return "••••••••";
    };

    const maskedKeys = keys.map((k) => ({
      _id: k._id.toString(),
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

    return Response.json({
      totals,
      byModel,
      dailySpend,
      keys: maskedKeys,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch financials" },
      { status: 500 }
    );
  }
}
