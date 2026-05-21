import { requireAdmin } from "@/lib/admin-auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import EmailLog from "@/models/EmailLog";
import AiTokenLog from "@/models/AiTokenLog";
import SystemApiKey from "@/models/SystemApiKey";
import SystemBlacklist from "@/models/SystemBlacklist";

export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  await dbConnect();

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. General totals in parallel
    const totalUsers = await User.countDocuments();
    
    // Active users: logged in or ran a campaign in the last 30 days
    const recentCampaignUserIds = await Campaign.distinct("userId", { updatedAt: { $gte: thirtyDaysAgo } });
    const activeUsers = await User.countDocuments({
      $or: [
        { lastLoginAt: { $gte: thirtyDaysAgo } },
        { _id: { $in: recentCampaignUserIds } }
      ]
    });

    const blacklistCount = await SystemBlacklist.countDocuments();

    // 2. Campaign breakdown
    const campaignStatusCounts = await Campaign.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const campaigns = {
      total: 0,
      draft: 0,
      generating: 0,
      ready: 0,
      sending: 0,
      completed: 0,
      failed: 0,
    };
    campaignStatusCounts.forEach((item) => {
      const status = item._id.toLowerCase();
      if (status in campaigns) {
        campaigns[status as keyof typeof campaigns] = item.count;
      }
    });
    campaigns.total = await Campaign.countDocuments();

    // 3. Email breakdown
    const emailStatusCounts = await EmailLog.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const emails = {
      total: 0,
      queued: 0,
      generated: 0,
      sent: 0,
      failed: 0,
      bounced: 0,
      replied: 0,
    };
    emailStatusCounts.forEach((item) => {
      const status = item._id.toLowerCase();
      if (status in emails) {
        emails[status as keyof typeof emails] = item.count;
      }
    });
    emails.total = await EmailLog.countDocuments();

    // 4. Financial breakdown
    const tokenLogStats = await AiTokenLog.aggregate([
      {
        $group: {
          _id: null,
          totalSpend: { $sum: "$costUsd" },
          totalTokens: { $sum: "$totalTokens" },
          totalCalls: { $sum: 1 },
          successCalls: { $sum: { $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0] } },
          failedCalls: { $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] } },
        }
      }
    ]);
    const financials = tokenLogStats[0] || {
      totalSpend: 0,
      totalTokens: 0,
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
    };

    // 5. API Key health breakdown
    const totalKeys = await SystemApiKey.countDocuments();
    const activeKeys = await SystemApiKey.countDocuments({ isActive: true });
    const rateLimitedKeys = await SystemApiKey.countDocuments({
      rateLimitedUntil: { $gt: new Date() }
    });

    const apiKeys = {
      total: totalKeys,
      active: activeKeys,
      rateLimited: rateLimitedKeys,
    };

    // 6. Recent campaigns list (last 5)
    const recentCampaignsList = await Campaign.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "name email image")
      .lean();

    // 7. Recent activity stream (chronological users, campaigns, blacklist)
    const recentUsersList = await User.find()
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    const recentBlacklistList = await SystemBlacklist.find()
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    const activities: any[] = [];
    recentCampaignsList.slice(0, 4).forEach((c: any) => {
      activities.push({
        id: `campaign-${c._id}`,
        type: "campaign",
        title: "Campaign Started",
        description: `Campaign "${c.name}" created with ${c.leadsCount} leads.`,
        user: c.userId ? { name: c.userId.name, email: c.userId.email, image: c.userId.image } : undefined,
        createdAt: c.createdAt,
      });
    });

    recentUsersList.forEach((u: any) => {
      activities.push({
        id: `user-${u._id}`,
        type: "user",
        title: "User Registered",
        description: `${u.name} (${u.email}) joined the platform.`,
        user: { name: u.name, email: u.email, image: u.image },
        createdAt: u.createdAt,
      });
    });

    recentBlacklistList.forEach((b: any) => {
      activities.push({
        id: `blacklist-${b._id}`,
        type: "blacklist",
        title: "Target Blacklisted",
        description: `"${b.domainOrEmail}" was added to system blacklist.`,
        createdAt: b.createdAt,
      });
    });

    // Sort combined activities by date descending, limit to 6
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recentActivities = activities.slice(0, 6);

    // 8. Daily email stats for the last 30 days (trends)
    const dailyEmailStats = await EmailLog.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%m-%d", date: "$createdAt" }
          },
          sent: { $sum: { $cond: [{ $in: ["$status", ["SENT", "REPLIED"]] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $in: ["$status", ["FAILED", "BOUNCED"]] }, 1, 0] } },
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          sent: 1,
          failed: 1,
        }
      }
    ]);

    // 9. API Keys performance summary list
    const systemApiKeysList = await SystemApiKey.find()
      .sort({ usageCount: -1 })
      .limit(5)
      .lean();
    const systemApiKeys = systemApiKeysList.map((k: any) => ({
      _id: k._id.toString(),
      provider: k.provider,
      label: k.label,
      isActive: k.isActive,
      usageCount: k.usageCount,
      averageLatencyMs: k.averageLatencyMs ?? 0,
      rateLimited: !!(k.rateLimitedUntil && new Date(k.rateLimitedUntil) > new Date()),
    }));

    return Response.json({
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      campaigns,
      emails,
      financials: {
        totalSpend: financials.totalSpend,
        totalTokens: financials.totalTokens,
        totalCalls: financials.totalCalls,
        successCalls: financials.successCalls,
        failedCalls: financials.failedCalls,
      },
      apiKeys,
      blacklist: {
        total: blacklistCount,
      },
      recentCampaigns: recentCampaignsList.map((c: any) => ({
        _id: c._id.toString(),
        name: c.name,
        leadsCount: c.leadsCount,
        sentCount: c.sentCount,
        failedCount: c.failedCount,
        status: c.status,
        createdAt: c.createdAt,
        user: c.userId ? {
          name: c.userId.name,
          email: c.userId.email,
          image: c.userId.image,
        } : null,
      })),
      recentActivities,
      dailyEmailStats,
      systemApiKeys,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load admin overview statistics" },
      { status: 500 }
    );
  }
}
