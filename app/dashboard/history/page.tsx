import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import { History, Search, FileText, CheckCircle2, AlertCircle, MailX, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/");
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user) redirect("/");

  const { page, search } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const limit = 4; // 4 campaigns per page for rich UI layout
  const skip = (currentPage - 1) * limit;
  const searchQuery = search || "";

  // MongoDB Filter
  const filterQuery: any = { userId: user._id };
  if (searchQuery) {
    filterQuery.name = { $regex: searchQuery, $options: "i" };
  }

  // Fetch campaign telemetry
  const totalCampaigns = await Campaign.countDocuments(filterQuery);
  const campaigns = await Campaign.find(filterQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalPages = Math.ceil(totalCampaigns / limit);

  // Status style helper
  const statusStyles = {
    DRAFT: "text-muted-foreground border-border bg-muted/30",
    GENERATING: "text-blue-400 border-blue-400/30 bg-blue-400/5",
    READY: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
    SENDING: "text-[#ea580c] border-[#ea580c]/30 bg-[#ea580c]/5",
    COMPLETED: "text-indigo-400 border-indigo-400/30 bg-indigo-400/5",
    FAILED: "text-red-400 border-red-400/30 bg-red-400/5",
  } as Record<string, string>;

  // Build page links
  const getPageLink = (pageNumber: number) => {
    const params = new URLSearchParams();
    params.set("page", String(pageNumber));
    if (searchQuery) params.set("search", searchQuery);
    return `/dashboard/history?${params.toString()}`;
  };

  return (
    <div className="space-y-8 animate-fade-in font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

        <Link
          href="/dashboard/campaign/new"
          className="px-5 py-3 border-2 border-foreground bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:border-[#ea580c] hover:text-background transition-all rounded-none text-center inline-block cursor-pointer self-start sm:self-auto"
        >
          New Campaign
        </Link>
      </div>

      {/* Search / filter Form */}
      <form method="GET" action="/dashboard/history" className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            name="search"
            defaultValue={searchQuery}
            placeholder="SEARCH CAMPAIGNS BY NAME..."
            className="w-full pl-10 pr-4 py-3 border-2 border-border bg-card text-foreground font-mono placeholder:text-muted-foreground/50 focus:border-[#ea580c] focus:outline-none transition-all rounded-none uppercase text-[10px] tracking-wider"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 border-2 border-border bg-card hover:border-[#ea580c] hover:text-[#ea580c] text-xs font-bold uppercase tracking-widest transition-all rounded-none cursor-pointer"
        >
          FILTER
        </button>
        {searchQuery && (
          <Link
            href="/dashboard/history"
            className="px-6 py-3 border-2 border-dashed border-border hover:border-red-400 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-all rounded-none text-center flex items-center justify-center"
          >
            CLEAR
          </Link>
        )}
      </form>

      {campaigns.length === 0 ? (
        <div className="border-2 border-border p-12 text-center bg-card flex flex-col items-center rounded-none">
          <div className="w-16 h-16 border-2 border-border bg-foreground/5 flex items-center justify-center mb-4 rounded-none">
            <History className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-2">No Records Located</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
            {searchQuery 
              ? `No campaigns match your query: "${searchQuery}". Try refining the criteria.`
              : "No historical records located. Launch your initial outbound campaign to gather telemetry here."}
          </p>
          {!searchQuery && (
            <Link
              href="/dashboard/campaign/new"
              className="px-6 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-[#ea580c] hover:text-background transition-colors rounded-none"
            >
              Create New Campaign
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Header Divider */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              // SECTION: Records
            </span>
            <div className="flex-1 border-t border-border" />
            <span className="inline-block h-2 w-2 bg-[#ea580c] animate-blink" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              {totalCampaigns.toString().padStart(2, "0")} TOTAL
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {campaigns.map((campaign: any) => {
              const bouncedCount = campaign.bouncedCount || 0;
              const deliveredCount = Math.max(0, campaign.sentCount - bouncedCount);
              const totalAttempted = campaign.leadsCount || campaign.totalLeads || 0;
              const successRate = totalAttempted > 0
                ? Math.round((deliveredCount / totalAttempted) * 100)
                : 0;

              return (
                <div
                  key={campaign._id.toString()}
                  className="bg-card border-2 border-border p-5 sm:p-6 transition-all hover:border-[#ea580c]/40 flex flex-col justify-between group relative overflow-hidden rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.02)]"
                >
                  {/* Subtle Background Accent on hover */}
                  <div className="absolute inset-0 bg-[#ea580c]/[0.005] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div>
                    {/* Card Title & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider truncate group-hover:text-[#ea580c] transition-colors">
                          {campaign.name}
                        </h3>
                        <p className="text-[9px] text-muted-foreground mt-0.5 font-mono uppercase">
                          PROCESSED ON {new Date(campaign.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).toUpperCase()}
                        </p>
                      </div>
                      <span className={`px-2.5 py-0.5 border text-[9px] font-bold uppercase tracking-[0.15em] self-start sm:self-auto rounded-none ${statusStyles[campaign.status] || "text-muted-foreground border-border"}`}>
                        {campaign.status}
                      </span>
                    </div>

                    {/* Stats Blocks */}
                    <div className="grid grid-cols-2 xs:grid-cols-4 gap-2.5 sm:gap-3">
                      <div className="bg-foreground/[0.01] p-3 sm:p-4 border border-border">
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="text-[8px] font-bold uppercase tracking-[0.15em]">Leads</span>
                        </div>
                        <p className="font-pixel text-lg sm:text-xl text-foreground leading-none">{totalAttempted}</p>
                      </div>

                      <div className="bg-emerald-400/[0.01] p-3 sm:p-4 border border-emerald-400/20">
                        <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span className="text-[8px] font-bold uppercase tracking-[0.15em]">Sent</span>
                        </div>
                        <p className="font-pixel text-lg sm:text-xl text-emerald-400 leading-none">{deliveredCount}</p>
                      </div>

                      <div className="bg-amber-400/[0.01] p-3 sm:p-4 border border-amber-400/20">
                        <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                          <MailX className="w-3 h-3 shrink-0" />
                          <span className="text-[8px] font-bold uppercase tracking-[0.15em]">Bounce</span>
                        </div>
                        <p className="font-pixel text-lg sm:text-xl text-amber-400 leading-none">{bouncedCount}</p>
                      </div>

                      <div className="bg-red-400/[0.01] p-3 sm:p-4 border border-red-500/20">
                        <div className="flex items-center gap-1.5 text-red-400 mb-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span className="text-[8px] font-bold uppercase tracking-[0.15em]">Fail</span>
                        </div>
                        <p className="font-pixel text-lg sm:text-xl text-red-400 leading-none">{campaign.failedCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Details */}
                  <div className="mt-5 pt-4 border-t border-border/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center flex-wrap gap-x-2">
                      Delivery Rate: <span className="text-[#ea580c] font-black">{successRate}%</span>
                      {bouncedCount > 0 && (
                        <span className="text-[9px] text-amber-400 lowercase font-bold">
                          ({bouncedCount} bounced)
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/history/${campaign._id}`}
                      className="text-[10px] font-black text-[#ea580c] hover:text-[#ea580c]/80 uppercase tracking-widest inline-flex items-center justify-center sm:justify-start gap-1.5 group/link border-2 border-dashed border-[#ea580c]/30 hover:border-[#ea580c] px-3.5 py-2 sm:p-0 sm:border-0 transition-all rounded-none shrink-0"
                    >
                      Inspect Logs
                      <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-2 border-border p-4 bg-card gap-4">
              {/* Pagination Info */}
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Page {currentPage} of {totalPages} — Showing {campaigns.length} of {totalCampaigns} Runs
              </div>

               {/* Pager Buttons */}
              <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                {currentPage > 1 ? (
                  <Link
                    href={getPageLink(currentPage - 1)}
                    className="p-2 border-2 border-border bg-card text-foreground hover:border-[#ea580c] hover:text-[#ea580c] rounded-none flex items-center justify-center cursor-pointer shrink-0"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="p-2 border-2 border-border text-muted-foreground/30 bg-muted/10 cursor-not-allowed rounded-none shrink-0">
                    <ChevronLeft className="w-4 h-4" />
                  </span>
                )}

                {/* Mobile page indicator */}
                <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  PAGE {currentPage} / {totalPages}
                </span>

                {/* Page Numbers (hidden on mobile, shown on sm+) */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    const isActive = currentPage === p;
                    return (
                      <Link
                        key={p}
                        href={getPageLink(p)}
                        className={`px-3 py-1.5 border-2 text-[10px] font-bold tracking-wider rounded-none ${
                          isActive
                            ? "border-[#ea580c] bg-[#ea580c] text-background"
                            : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20"
                        }`}
                      >
                        {String(p).padStart(2, "0")}
                      </Link>
                    );
                  })}
                </div>

                {currentPage < totalPages ? (
                  <Link
                    href={getPageLink(currentPage + 1)}
                    className="p-2 border-2 border-border bg-card text-foreground hover:border-[#ea580c] hover:text-[#ea580c] rounded-none flex items-center justify-center cursor-pointer shrink-0"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="p-2 border-2 border-border text-muted-foreground/30 bg-muted/10 cursor-not-allowed rounded-none shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
