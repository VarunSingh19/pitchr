import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import EmailLog from "@/models/EmailLog";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { CampaignHistoryDetails } from "@/components/campaign-history-details";

export default async function CampaignDetailsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/");
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user) redirect("/");

  const campaign = await Campaign.findOne({ _id: campaignId, userId: user._id }).lean();
  if (!campaign) redirect("/dashboard/history");

  const logs = await EmailLog.find({ campaignId: campaign._id })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="space-y-8 animate-fade-in font-mono">
      {/* Header */}
      <div className="flex items-start sm:items-center gap-4">
        <Link
          href="/dashboard/history"
          className="p-2 border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:border-[#ea580c] transition-colors rounded-none mt-1 sm:mt-0 cursor-pointer flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {new Date(campaign.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }).toUpperCase()}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground uppercase tracking-wider truncate">
            {campaign.name}
          </h1>
        </div>
      </div>

      {/* Interactive Outbox Logs */}
      <CampaignHistoryDetails logs={JSON.parse(JSON.stringify(logs))} />
    </div>
  );
}
