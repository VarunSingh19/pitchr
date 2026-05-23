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
  
  // Enforce plan expiry first
  await enforcePlanExpiry(user);

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

  // Admins bypass all limit checks
  if (user.role === "admin") {
    return {
      allowed: true,
      details,
    };
  }

  // If creating a campaign (additionalEmailsCount is 0), check campaign count limit
  if (additionalEmailsCount === 0 && campaignsUsed >= maxCampaigns) {
    return {
      allowed: false,
      reason: `You have reached the maximum number of campaigns (${campaignsUsed}/${maxCampaigns}) allowed on your plan. Delete old campaigns, or upgrade your plan / contact your admin to increase your limits.`,
      details,
    };
  }

  // If sending/generating emails, check email quotas
  if (additionalEmailsCount > 0) {
    if (dailyUsed + additionalEmailsCount > emailsPerDay) {
      return {
        allowed: false,
        reason: `Adding ${additionalEmailsCount} emails would exceed your daily sending quota of ${emailsPerDay} (Used today: ${dailyUsed}). Upgrade your plan or contact your admin to increase your limits.`,
        details,
      };
    }

    if (monthlyUsed + additionalEmailsCount > emailsPerMonth) {
      return {
        allowed: false,
        reason: `Adding ${additionalEmailsCount} emails would exceed your monthly sending quota of ${emailsPerMonth} (Used this month: ${monthlyUsed}). Upgrade your plan or contact your admin to increase your limits.`,
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

/**
 * Automatically checks if a user's plan has expired, and if so downgrades them immediately to "free".
 */
export async function enforcePlanExpiry(user: IUser): Promise<IUser> {
  await dbConnect();
  const User = (await import("@/models/User")).default;
  let didUpdate = false;

  // ── Auto-Heal: Upgraded Plan Recovery ──
  // If the user's plan is still missing, uninitialized, or "free" in the database, but they have
  // an active approved SubscriptionRequest from the last 30 days, auto-heal and sync the user's plan.
  if (!user.plan || user.plan === "free") {
    const SubscriptionRequest = (await import("@/models/SubscriptionRequest")).default;
    const activeRequest = await SubscriptionRequest.findOne({
      userId: user._id,
      status: "approved",
    }).sort({ reviewedAt: -1 });

    if (activeRequest) {
      const approvalDate = activeRequest.reviewedAt || activeRequest.updatedAt || activeRequest.createdAt;
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const expiryDate = new Date(new Date(approvalDate).getTime() + thirtyDays);
      if (expiryDate > new Date()) {
        const { PLAN_CONFIGS } = await import("@/lib/quota-config");
        const config = PLAN_CONFIGS[activeRequest.plan];
        if (config) {
          await User.findByIdAndUpdate(user._id, {
            $set: {
              plan: activeRequest.plan,
              planExpiresAt: expiryDate,
              "quotas.emailsPerDay": config.emailsPerDay,
              "quotas.emailsPerMonth": config.emailsPerMonth,
              "quotas.maxCampaigns": config.maxCampaigns,
              "quotas.allowedModels": config.allowedModels,
            },
          });
          didUpdate = true;
          console.log(`[enforcePlanExpiry/auto-heal] Successfully synced and healed plan for ${user.email} to ${activeRequest.plan} using date ${approvalDate}`);
        }
      }
    }
  }

  // ── Enforce Expiry ──
  if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
    const { PLAN_CONFIGS } = await import("@/lib/quota-config");
    const freeConfig = PLAN_CONFIGS.free;
    await User.findByIdAndUpdate(user._id, {
      $set: {
        plan: "free",
        planExpiresAt: null,
        "quotas.emailsPerDay": freeConfig.emailsPerDay,
        "quotas.emailsPerMonth": freeConfig.emailsPerMonth,
        "quotas.maxCampaigns": freeConfig.maxCampaigns,
        "quotas.allowedModels": freeConfig.allowedModels,
      },
    });
    didUpdate = true;
    console.log(`[enforcePlanExpiry] Downgraded user ${user.email} to free plan (expired)`);
  }

  if (didUpdate) {
    const freshUser = await User.findById(user._id);
    if (freshUser) {
      return freshUser;
    }
  }

  return user;
}

/**
 * Updates a user's plan and rescales their quotas in the database according to PLAN_CONFIGS.
 */
export async function updateUserPlanQuotas(userId: string | any, planName: "free" | "starter" | "pro" | "enterprise") {
  const { PLAN_CONFIGS } = await import("@/lib/quota-config");
  const config = PLAN_CONFIGS[planName];
  if (!config) throw new Error(`Invalid plan: ${planName}`);

  await dbConnect();
  const User = (await import("@/models/User")).default;
  const planExpiresAt = planName === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days expiry

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        plan: planName,
        planExpiresAt,
        "quotas.emailsPerDay": config.emailsPerDay,
        "quotas.emailsPerMonth": config.emailsPerMonth,
        "quotas.maxCampaigns": config.maxCampaigns,
        "quotas.allowedModels": config.allowedModels,
      },
    },
    { new: true }
  );

  if (!updated) {
    console.error(`[updateUserPlanQuotas] User not found for ID: ${userId}`);
    throw new Error(`User not found for plan upgrade (ID: ${userId})`);
  }

  console.log(
    `[updateUserPlanQuotas] Updated user ${updated.email} to plan "${planName}" ` +
    `(expires: ${planExpiresAt?.toISOString() ?? "never"}, quotas: ${config.emailsPerDay}/${config.emailsPerMonth}/${config.maxCampaigns})`
  );
}
