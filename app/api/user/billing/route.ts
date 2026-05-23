import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import EmailLog from "@/models/EmailLog";
import SubscriptionRequest from "@/models/SubscriptionRequest";
import { enforcePlanExpiry } from "@/lib/quota";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    let user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Enforce plan expiry dynamically
    user = await enforcePlanExpiry(user);

    // Calculate usage stats
    const campaignsUsed = await Campaign.countDocuments({ userId: user._id });

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const dailyUsed = await EmailLog.countDocuments({
      userId: user._id,
      status: { $in: ["SENT", "REPLIED", "BOUNCED"] },
      createdAt: { $gte: startOfDay },
    });

    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const monthlyUsed = await EmailLog.countDocuments({
      userId: user._id,
      status: { $in: ["SENT", "REPLIED", "BOUNCED"] },
      createdAt: { $gte: startOfMonth },
    });

    // Get subscription requests history
    const requests = await SubscriptionRequest.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({
      plan: user.plan || "free",
      planExpiresAt: user.planExpiresAt || null,
      quotas: user.quotas || {
        emailsPerDay: 10,
        emailsPerMonth: 100,
        maxCampaigns: 3,
        allowedModels: ["gemini-2.5-flash"],
      },
      usage: {
        campaignsUsed,
        dailyUsed,
        monthlyUsed,
      },
      requests,
    });
  } catch (error) {
    console.error("Billing fetch error:", error);
    return Response.json({ error: "Failed to fetch billing details" }, { status: 500 });
  }
}
