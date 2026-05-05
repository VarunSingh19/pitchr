import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import { History, Search, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/");
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user) redirect("/");

  // Fetch campaigns for this user, newest first
  const campaigns = await Campaign.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <History className="w-6 h-6 text-accent-primary" />
            Campaign History
          </h1>
          <p className="text-text-secondary mt-1">
            View the performance and details of your past outreach campaigns.
          </p>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="border border-border-default rounded-2xl p-12 text-center bg-bg-surface flex flex-col items-center">
          <div className="w-16 h-16 bg-bg-subtle rounded-full flex items-center justify-center mb-4">
            <History className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Campaigns Yet</h3>
          <p className="text-text-secondary max-w-md mx-auto mb-6">
            You haven't sent any email campaigns yet. Start a new campaign to see your history here!
          </p>
          <Link
            href="/dashboard/campaign/new"
            className="px-6 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium transition-all"
          >
            Create New Campaign
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign: any) => {
            const successRate = campaign.leadsCount > 0 
              ? Math.round((campaign.sentCount / campaign.leadsCount) * 100) 
              : 0;

            return (
              <div 
                key={campaign._id.toString()}
                className="bg-bg-surface border border-border-default rounded-2xl p-6 transition-all hover:border-accent-primary/30"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                      {campaign.name}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Sent on {new Date(campaign.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-accent-dim text-accent-primary text-xs font-semibold uppercase tracking-wider">
                    {campaign.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
                    <div className="flex items-center gap-2 text-text-muted mb-1">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">Total Leads</span>
                    </div>
                    <p className="text-2xl font-bold text-text-primary">{campaign.leadsCount}</p>
                  </div>

                  <div className="bg-success/5 rounded-xl p-4 border border-success/20">
                    <div className="flex items-center gap-2 text-success mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">Sent</span>
                    </div>
                    <p className="text-2xl font-bold text-success">{campaign.sentCount}</p>
                  </div>

                  <div className="bg-error/5 rounded-xl p-4 border border-error/20">
                    <div className="flex items-center gap-2 text-error mb-1">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">Failed</span>
                    </div>
                    <p className="text-2xl font-bold text-error">{campaign.failedCount}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border-default flex items-center justify-between">
                  <div className="text-sm font-medium text-text-secondary">
                    Delivery Success Rate: <span className="text-text-primary">{successRate}%</span>
                  </div>
                  <Link 
                    href={`/dashboard/history/${campaign._id}`}
                    className="text-sm font-medium text-accent-primary hover:text-accent-primary-hover transition-colors"
                  >
                    View Full Logs →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
