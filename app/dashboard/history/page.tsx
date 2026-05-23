import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import { History, Search, FileText, CheckCircle2, AlertCircle, MailX, ArrowRight } from "lucide-react";
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
    <div className="space-y-8 animate-fade-in font-mono">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2.5 h-2.5 bg-[#ea580c] animate-blink" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            // PIPELINE ARCHIVES
          </span>
        </div>
        <h1 className="font-pixel text-3xl sm:text-4xl tracking-tight text-foreground">
          CAMPAIGN HISTORY
        </h1>
        <p className="text-xs text-muted-foreground mt-1 tracking-wide">
          Inspect, evaluate, and trace historical outbound runs
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="border-2 border-border p-12 text-center bg-card flex flex-col items-center rounded-none">
          <div className="w-16 h-16 border-2 border-border bg-foreground/5 flex items-center justify-center mb-4 rounded-none">
            <History className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-2">No Campaigns Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
            No historical records located. Launch your initial outbound campaign to gather telemetry here.
          </p>
          <Link
            href="/dashboard/campaign/new"
            className="px-6 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-colors rounded-none"
          >
            Create New Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              // SECTION: Records
            </span>
            <div className="flex-1 border-t border-border" />
            <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              {campaigns.length.toString().padStart(2, "0")}
            </span>
          </div>

          <div className="grid gap-6">
            {campaigns.map((campaign: any) => {
              const bouncedCount = campaign.bouncedCount || 0;
              const deliveredCount = Math.max(0, campaign.sentCount - bouncedCount);
              const totalAttempted = campaign.leadsCount || campaign.totalLeads || 0;
              const successRate = totalAttempted > 0
                ? Math.round((deliveredCount / totalAttempted) * 100)
                : 0;

              const statusStyles = {
                DRAFT: "text-muted-foreground border-border bg-muted/30",
                GENERATING: "text-blue-400 border-blue-400/30 bg-blue-400/5",
                READY: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
                SENDING: "text-[#ea580c] border-[#ea580c]/30 bg-[#ea580c]/5",
                COMPLETED: "text-indigo-400 border-indigo-400/30 bg-indigo-400/5",
                FAILED: "text-red-400 border-red-400/30 bg-red-400/5",
              } as Record<string, string>;

              return (
                <div 
                  key={campaign._id.toString()}
                  className="bg-card border-2 border-border p-6 transition-all hover:border-[#ea580c]/40 rounded-none"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider truncate">
                        {campaign.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        PROCESSED ON {new Date(campaign.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).toUpperCase()}
                      </p>
                    </div>
                    <span className={`self-start sm:self-auto px-3 py-1 border text-[9px] font-bold uppercase tracking-[0.15em] rounded-none ${statusStyles[campaign.status] || "text-muted-foreground border-border"}`}>
                      {campaign.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-foreground/[0.01] rounded-none p-4 border border-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Total Leads</span>
                      </div>
                      <p className="font-pixel text-xl text-foreground">{totalAttempted}</p>
                    </div>

                    <div className="bg-emerald-400/[0.01] rounded-none p-4 border border-emerald-400/20">
                      <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Delivered</span>
                      </div>
                      <p className="font-pixel text-xl text-emerald-400">{deliveredCount}</p>
                    </div>

                    <div className="bg-amber-400/[0.01] rounded-none p-4 border border-amber-400/20">
                      <div className="flex items-center gap-2 text-amber-400 mb-1.5">
                        <MailX className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Bounced</span>
                      </div>
                      <p className="font-pixel text-xl text-amber-400">{bouncedCount}</p>
                    </div>

                    <div className="bg-red-400/[0.01] rounded-none p-4 border border-red-500/20">
                      <div className="flex items-center gap-2 text-red-400 mb-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Failed</span>
                      </div>
                      <p className="font-pixel text-xl text-red-400">{campaign.failedCount}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Delivery Rate: <span className="text-[#ea580c]">{successRate}%</span>
                      {bouncedCount > 0 && (
                        <span className="text-[10px] text-amber-400 font-bold ml-2 lowercase">
                          ({bouncedCount} bounced)
                        </span>
                      )}
                    </div>
                    <Link 
                      href={`/dashboard/history/${campaign._id}`}
                      className="text-xs font-bold text-[#ea580c] hover:text-[#ea580c]/80 uppercase tracking-widest inline-flex items-center gap-1.5 group"
                    >
                      View Logs 
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
