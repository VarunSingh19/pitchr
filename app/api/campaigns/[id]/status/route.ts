import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import Campaign from "@/models/Campaign";
import EmailLog from "@/models/EmailLog";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    const logs = await EmailLog.find({ campaignId: id });
    
    const generated = logs.filter(l => l.status === "GENERATED" || l.status === "SENT").length;
    const failed = logs.filter(l => l.status === "FAILED").length;
    const pending = logs.filter(l => l.status === "PENDING").length;
    const sending = logs.filter(l => l.status === "SENDING").length;
    const total = campaign.totalLeads;
    const status = campaign.status;

    return Response.json({ 
      generated, 
      failed,
      pending,
      sending,
      total, 
      status,
      sentCount: campaign.sentCount || 0,
      bouncedCount: campaign.bouncedCount || 0,
    });
  } catch (error) {
    return Response.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
