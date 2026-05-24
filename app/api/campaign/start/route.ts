import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import { inngest } from "@/inngest/client";

import { checkUserQuotas } from "@/lib/quota";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId, leads, resumeText, autoSend } = await request.json();

    if (!campaignId || !leads || !Array.isArray(leads) || leads.length === 0) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const campaign = await Campaign.findOne({ _id: campaignId, userId: user._id });
    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Deduplicate leads by contact_email + company name (case-insensitive) to prevent duplicate outbound emails
    const uniqueLeadsMap = new Map<string, any>();
    for (const lead of leads) {
      const emailNormalized = String(lead.contact_email || "").trim().toLowerCase();
      const companyNormalized = String(lead.company || "").trim().toLowerCase();
      const key = `${emailNormalized}::${companyNormalized}`;
      if (!uniqueLeadsMap.has(key)) {
        uniqueLeadsMap.set(key, lead);
      }
    }
    const uniqueLeads = Array.from(uniqueLeadsMap.values());

    // Check daily/monthly sending limits quota
    const quotaCheck = await checkUserQuotas(user, uniqueLeads.length);
    if (!quotaCheck.allowed) {
      return Response.json({ error: quotaCheck.reason }, { status: 403 });
    }

    // 1. Prepare events for Inngest
    const events = uniqueLeads.map((lead: any) => ({
      name: "campaign/generate.email",
      data: {
        campaignId,
        lead,
        userId: user._id.toString(),
        resumeText,
        userName: user.name,
      },
    }));

    // 2. Queue all leads via Inngest
    await inngest.send(events);

    // 3. Update Campaign status ONLY after Inngest confirms receipt
    campaign.status = "GENERATING";
    campaign.totalLeads = uniqueLeads.length;
    campaign.autoSend = autoSend || false;
    campaign.leads = uniqueLeads;
    await campaign.save();

    return Response.json({ success: true, queuedCount: leads.length });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Ensure Campaign status stays as DRAFT (it naturally does since we didn't save)
    return Response.json({ error: `Failed to start campaign: ${message}` }, { status: 500 });
  }
}
