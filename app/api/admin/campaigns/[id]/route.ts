import { requireAdmin } from "@/lib/admin-auth";
import { dbConnect } from "@/lib/db";
import Campaign from "@/models/Campaign";
import EmailLog from "@/models/EmailLog";
import User from "@/models/User";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  if (!id) {
    return Response.json({ error: "Campaign ID is required" }, { status: 400 });
  }

  await dbConnect();

  try {
    const campaign = await Campaign.findById(id)
      .populate("userId", "name email image")
      .lean();

    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Fetch all logs associated with this campaign
    const logs = await EmailLog.find({ campaignId: id })
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({
      campaign,
      logs,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load campaign details" },
      { status: 500 }
    );
  }
}
