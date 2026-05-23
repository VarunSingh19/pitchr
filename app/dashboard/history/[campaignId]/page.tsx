import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import EmailLog from "@/models/EmailLog";
import { ArrowLeft, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import Link from "next/link";

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
          className="p-2 border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:border-[#ea580c] transition-colors rounded-none mt-1 sm:mt-0 cursor-pointer"
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

      {/* Logs Table */}
      <div className="border-2 border-border bg-card rounded-none overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-border flex items-center justify-between bg-foreground/[0.02]">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground">Email Outbox Log</div>
          <div className="text-[9px] font-bold px-2 py-0.5 border border-[#ea580c]/30 bg-[#ea580c]/5 text-[#ea580c] uppercase tracking-wider">
            {logs.length} entries
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground uppercase tracking-wider text-[9px] font-bold">
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Company</th>
                <th className="px-5 py-3.5">Recipient</th>
                <th className="px-5 py-3.5">Subject</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground italic">
                    No email logs generated for this campaign yet.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log._id.toString()} className="hover:bg-foreground/[0.01] transition-colors">
                    <td className="px-5 py-3.5">
                      {log.status === "SENT" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-400/20 bg-emerald-400/5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-none">
                          <CheckCircle2 className="w-3 h-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-none">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-foreground">
                      {log.companyName}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs font-mono select-all">
                      {log.recipientEmail}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground truncate max-w-[200px]" title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="px-5 py-3.5 text-[10px] text-right font-mono">
                      {log.status === "SENT" ? (
                        <span className="text-muted-foreground/60 select-all">ID: {log.messageId?.substring(0, 15)}...</span>
                      ) : (
                        <span className="text-red-400 truncate max-w-[200px] inline-block" title={log.error}>
                          {log.error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
