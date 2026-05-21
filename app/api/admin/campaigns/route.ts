import { requireAdmin } from "@/lib/admin-auth";
import { dbConnect } from "@/lib/db";
import Campaign from "@/models/Campaign";
import EmailLog from "@/models/EmailLog";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Overall Statistics (Last 30 Days)
    const totalCampaigns = await Campaign.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    // Status breakdowns
    const campaignStatusCounts = await Campaign.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const statusBreakdown = {
      DRAFT: 0,
      GENERATING: 0,
      READY: 0,
      SENDING: 0,
      COMPLETED: 0,
      FAILED: 0,
    } as Record<string, number>;
    campaignStatusCounts.forEach((item) => {
      if (item._id in statusBreakdown) {
        statusBreakdown[item._id] = item.count;
      }
    });

    // Email outcomes statistics from EmailLog
    const emailStats = await EmailLog.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $in: ["$status", ["SENT", "REPLIED"]] }, 1, 0] } },
          bounced: { $sum: { $cond: [{ $eq: ["$status", "BOUNCED"] }, 1, 0] } },
          replied: { $sum: { $cond: [{ $eq: ["$status", "REPLIED"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] } },
        }
      }
    ]);
    
    const overallEmailStats = emailStats[0] || {
      total: 0,
      sent: 0,
      bounced: 0,
      replied: 0,
      failed: 0,
    };

    // 2. Group by Target Domains (Last 30 Days)
    const domainStats = await EmailLog.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $project: {
          status: 1,
          domain: {
            $toLower: {
              $arrayElemAt: [{ $split: ["$recipientEmail", "@"] }, 1]
            }
          }
        }
      },
      {
        $project: {
          status: 1,
          group: {
            $cond: {
              if: { $in: ["$domain", ["gmail.com"]] },
              then: "Gmail",
              else: {
                $cond: {
                  if: { $in: ["$domain", ["outlook.com", "hotmail.com", "live.com", "msn.com"]] },
                  then: "Outlook",
                  else: {
                    $cond: {
                      if: { $in: ["$domain", ["yahoo.com", "ymail.com", "myyahoo.com"]] },
                      then: "Yahoo",
                      else: "Corporate"
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: "$group",
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $in: ["$status", ["SENT", "REPLIED"]] }, 1, 0] } },
          bounced: { $sum: { $cond: [{ $eq: ["$status", "BOUNCED"] }, 1, 0] } },
          replied: { $sum: { $cond: [{ $eq: ["$status", "REPLIED"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] } },
        }
      }
    ]);

    const domainBreakdown = {
      Gmail: { total: 0, sent: 0, bounced: 0, replied: 0, failed: 0 },
      Outlook: { total: 0, sent: 0, bounced: 0, replied: 0, failed: 0 },
      Yahoo: { total: 0, sent: 0, bounced: 0, replied: 0, failed: 0 },
      Corporate: { total: 0, sent: 0, bounced: 0, replied: 0, failed: 0 },
    } as Record<string, any>;

    domainStats.forEach((item) => {
      if (item._id in domainBreakdown) {
        domainBreakdown[item._id] = {
          total: item.total,
          sent: item.sent,
          bounced: item.bounced,
          replied: item.replied,
          failed: item.failed,
        };
      }
    });

    // 3. Campaigns List with Pagination & Search
    let userIds: any[] = [];
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ]
      }).select("_id");
      userIds = users.map((u) => u._id);
    }

    const query: Record<string, any> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { userId: { $in: userIds } }
      ];
    }
    if (status) {
      query.status = status;
    }

    const totalCount = await Campaign.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email image")
      .lean();

    return Response.json({
      stats: {
        totalCampaigns,
        statusBreakdown,
        emails: overallEmailStats,
      },
      domainBreakdown,
      campaigns,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      }
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load admin campaigns dashboard data" },
      { status: 500 }
    );
  }
}
