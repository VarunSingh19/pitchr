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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start sm:items-center gap-4">
        <Link
          href="/dashboard/history"
          className="p-2 flex-shrink-0 rounded-xl border border-border-default hover:bg-bg-elevated transition-colors text-text-muted hover:text-text-primary mt-1 sm:mt-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary truncate">
            {campaign.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary mt-1">
            <Calendar className="w-4 h-4" />
            {new Date(campaign.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden">
        <div className="px-5 py-3 border-b border-border-default flex items-center justify-between bg-bg-elevated/50">
          <div className="text-sm font-medium text-text-primary">Email Logs</div>
          <div className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-accent-dim text-accent-primary">
            {logs.length} Total
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-text-muted text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Recipient</th>
                <th className="px-5 py-3 font-medium">Subject</th>
                <th className="px-5 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {logs.map((log: any) => (
                <tr key={log._id.toString()} className="hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-5 py-3">
                    {log.status === "SENT" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 text-success text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-error/10 text-error text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-medium text-text-primary">
                    {log.companyName}
                  </td>
                  <td className="px-5 py-3 text-text-secondary font-mono text-xs">
                    {log.recipientEmail}
                  </td>
                  <td className="px-5 py-3 text-text-secondary truncate max-w-[200px]">
                    {log.subject}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {log.status === "SENT" ? (
                      <span className="text-text-faint font-mono">ID: {log.messageId?.substring(0, 15)}...</span>
                    ) : (
                      <span className="text-error truncate max-w-[200px] block" title={log.error}>
                        {log.error}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
