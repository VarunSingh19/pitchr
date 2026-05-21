import { dbConnect } from "@/lib/db";
import EmailLog from "@/models/EmailLog";
import Campaign from "@/models/Campaign";
import { type IUser } from "@/models/User";

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  details?: {
    dailyLimit: number;
    dailyUsed: number;
    monthlyLimit: number;
    monthlyUsed: number;
    maxCampaigns: number;
    campaignsUsed: number;
  };
}

/**
 * Verify whether a user is within their allowed campaigns and emails quota.
 * 
 * @param user The Mongoose user document
 * @param additionalEmailsCount If > 0, verifies if adding this number of emails exceeds daily/monthly limits.
 */
export async function checkUserQuotas(
  user: IUser,
  additionalEmailsCount = 0
): Promise<QuotaCheckResult> {
  await dbConnect();

  const emailsPerDay = user.quotas?.emailsPerDay ?? 100;
  const emailsPerMonth = user.quotas?.emailsPerMonth ?? 2000;
  const maxCampaigns = user.quotas?.maxCampaigns ?? 10;

  // 1. Get campaigns count
  const campaignsUsed = await Campaign.countDocuments({ userId: user._id });

  // 2. Get daily emails sent (SENT or REPLIED, or in fact SENT/FAILED/REPLIED/BOUNCED? Usually we count only SENT/REPLIED/BOUNCED because they hit the SMTP server)
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const dailyUsed = await EmailLog.countDocuments({
    userId: user._id,
    status: { $in: ["SENT", "REPLIED", "BOUNCED"] },
    createdAt: { $gte: startOfDay },
  });

  // 3. Get monthly emails sent
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const monthlyUsed = await EmailLog.countDocuments({
    userId: user._id,
    status: { $in: ["SENT", "REPLIED", "BOUNCED"] },
    createdAt: { $gte: startOfMonth },
  });

  const details = {
    dailyLimit: emailsPerDay,
    dailyUsed,
    monthlyLimit: emailsPerMonth,
    monthlyUsed,
    maxCampaigns,
    campaignsUsed,
  };

  // If creating a campaign (additionalEmailsCount is 0), check campaign count limit
  if (additionalEmailsCount === 0 && campaignsUsed >= maxCampaigns) {
    return {
      allowed: false,
      reason: `You have reached the maximum number of campaigns (${campaignsUsed}/${maxCampaigns}). Delete old campaigns or contact admin to increase your limit.`,
      details,
    };
  }

  // If sending/generating emails, check email quotas
  if (additionalEmailsCount > 0) {
    if (dailyUsed + additionalEmailsCount > emailsPerDay) {
      return {
        allowed: false,
        reason: `Adding ${additionalEmailsCount} emails would exceed your daily sending quota of ${emailsPerDay} (Used today: ${dailyUsed}).`,
        details,
      };
    }

    if (monthlyUsed + additionalEmailsCount > emailsPerMonth) {
      return {
        allowed: false,
        reason: `Adding ${additionalEmailsCount} emails would exceed your monthly sending quota of ${emailsPerMonth} (Used this month: ${monthlyUsed}).`,
        details,
      };
    }
  }

  return {
    allowed: true,
    details,
  };
}

/**
 * Resolves the dynamic whitelist of allowed model IDs for a user based on:
 * 1. The user's quotas.allowedModels settings.
 * 2. System-active models (models supported by active system keys).
 * If the user's allowedModels list contains no active system models, they dynamically
 * get access to all active system models.
 */
export async function resolveUserAllowedModels(user: IUser): Promise<string[]> {
  const SystemApiKey = (await import("@/models/SystemApiKey")).default;
  await dbConnect();
  
  const now = new Date();
  const activeKeys = await SystemApiKey.find({
    isActive: true,
    $or: [
      { rateLimitedUntil: null },
      { rateLimitedUntil: { $lte: now } },
    ],
  }).select("supportedModels").lean();

  const availableModelIds = new Set<string>();
  for (const key of activeKeys) {
    if (key.supportedModels) {
      for (const modelId of key.supportedModels) {
        availableModelIds.add(modelId);
      }
    }
  }

  const userAllowed = user.quotas?.allowedModels || [];
  const effectiveAllowed = userAllowed.filter((m: string) => availableModelIds.has(m));

  if (effectiveAllowed.length === 0) {
    return Array.from(availableModelIds);
  }
  return effectiveAllowed;
}

/**
 * Resolves the actual model ID to use for email generation or replies.
 * If user.selectedModel is not within their resolved allowed models, falls back to the first allowed model.
 */
export async function resolveUserSelectedModel(user: IUser): Promise<string> {
  const allowed = await resolveUserAllowedModels(user);
  if (allowed.length === 0) {
    throw new Error("No active AI models are available in the system.");
  }
  const currentModel = user.selectedModel;
  if (currentModel && allowed.includes(currentModel)) {
    return currentModel;
  }
  return allowed[0];
}
