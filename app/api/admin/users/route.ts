import { requireAdmin } from "@/lib/admin-auth";
import { dbConnect } from "@/lib/db";
import { verifyOrigin, forbiddenResponse } from "@/lib/auth-helpers";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import EmailLog from "@/models/EmailLog";
import SystemApiKey from "@/models/SystemApiKey";

/**
 * GET /api/admin/users
 * Returns a list of all users with detailed status and campaign/email metrics.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  await dbConnect();

  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    
    // Fetch models supported by currently active system API keys
    const activeKeys = await SystemApiKey.find({ isActive: true }).select("supportedModels").lean();
    const activeModels = Array.from(
      new Set(activeKeys.flatMap((k) => k.supportedModels || []))
    );

    // Map stats in parallel for efficiency
    const usersWithStats = await Promise.all(
      users.map(async (user: any) => {
        const campaignCount = await Campaign.countDocuments({ userId: user._id });
        const emailsSent = await EmailLog.countDocuments({
          userId: user._id,
          status: "SENT",
        });
        const emailsBounced = await EmailLog.countDocuments({
          userId: user._id,
          status: "BOUNCED",
        });

        // Determine active status: logged in or ran a campaign in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        let isActive = false;
        if (user.lastLoginAt && new Date(user.lastLoginAt) > thirtyDaysAgo) {
          isActive = true;
        } else {
          const recentCampaign = await Campaign.findOne({
            userId: user._id,
            updatedAt: { $gte: thirtyDaysAgo },
          });
          if (recentCampaign) {
            isActive = true;
          }
        }

        return {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          plan: user.plan || "free",
          lastLoginAt: user.lastLoginAt || null,
          createdAt: user.createdAt,
          campaignCount,
          emailsSent,
          emailsBounced,
          isActive,
          quotas: {
            emailsPerDay: user.quotas?.emailsPerDay ?? 100,
            emailsPerMonth: user.quotas?.emailsPerMonth ?? 2000,
            maxCampaigns: user.quotas?.maxCampaigns ?? 10,
            allowedModels: user.quotas?.allowedModels || [],
          },
        };
      })
    );

    return Response.json({ users: usersWithStats, activeModels });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Updates a user's role or quotas.
 */
export async function PATCH(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  try {
    const { userId, role, plan, quotas } = await request.json();

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    await dbConnect();

    const updateFields: Record<string, any> = {};

    if (role !== undefined) {
      if (role !== "user" && role !== "admin") {
        return Response.json({ error: "Invalid role value" }, { status: 400 });
      }
      updateFields.role = role;
    }

    if (plan !== undefined) {
      const validPlans = ["free", "starter", "pro", "enterprise"];
      if (!validPlans.includes(plan)) {
        return Response.json({ error: "Invalid plan value" }, { status: 400 });
      }
      updateFields.plan = plan;
    }

    if (quotas !== undefined) {
      if (
        typeof quotas.emailsPerDay !== "number" ||
        typeof quotas.emailsPerMonth !== "number" ||
        typeof quotas.maxCampaigns !== "number" ||
        !Array.isArray(quotas.allowedModels)
      ) {
        return Response.json({ error: "Invalid quotas payload" }, { status: 400 });
      }
      updateFields.quotas = quotas;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!updatedUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 500 }
    );
  }
}
