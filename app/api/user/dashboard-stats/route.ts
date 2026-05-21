import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import EmailLog from "@/models/EmailLog";
import { Types } from "mongoose";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const userId = new Types.ObjectId(session.user.id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Fetch user to check setup status
    const user = await User.findById(userId).lean();
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const setup = {
      gmailConnected: !!user.gmailConfig?.validated,
      resumeUploaded: !!user.resume,
    };

    const profile = {
      name: user.name,
      email: user.email,
      image: user.image,
    };

    // 2. Aggregations in parallel: campaigns breakdown, emails breakdown, daily trend, recent campaigns
    const [campaignStatusCounts, emailStatusCounts, recentCampaignsList, dailyEmailStats] = await Promise.all([
      // Campaign breakdown scoped to user
      Campaign.aggregate([
        { $match: { userId } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      // Email breakdown scoped to user
      EmailLog.aggregate([
        { $match: { userId } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      // Recent campaigns (last 5) for this user
      Campaign.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      // Daily email stats for the last 30 days scoped to this user
      EmailLog.aggregate([
        { $match: { userId, createdAt: { $gte: thirtyDaysAgo } } },
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
      ])
    ]);

    // Parse Campaign status breakdown
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
    campaigns.total = await Campaign.countDocuments({ userId });

    // Parse Email status breakdown
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
    emails.total = await EmailLog.countDocuments({ userId });

    return Response.json({
      setup,
      profile,
      campaigns,
      emails,
      recentCampaigns: recentCampaignsList.map((c: any) => ({
        _id: c._id.toString(),
        name: c.name,
        leadsCount: c.leadsCount,
        sentCount: c.sentCount,
        failedCount: c.failedCount,
        status: c.status,
        createdAt: c.createdAt,
      })),
      dailyEmailStats,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load user dashboard stats" },
      { status: 500 }
    );
  }
}
