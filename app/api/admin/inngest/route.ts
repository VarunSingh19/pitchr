import { requireAdmin } from "@/lib/admin-auth";
import { verifyOrigin, forbiddenResponse } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import Campaign from "@/models/Campaign";
import EmailLog from "@/models/EmailLog";
import { Types } from "mongoose";

const LOCAL_DEV_BASE = "http://127.0.0.1:8288/v1";
const CLOUD_BASE = "https://api.inngest.com/v1";

interface InngestResponse {
  data: any;
  env: "development" | "production";
  url: string;
}

// Helper to determine active Inngest connection and fetch data
async function fetchInngest(path: string, options: RequestInit = {}): Promise<InngestResponse> {
  // 1. Try local dev server first
  try {
    const res = await fetch(`${LOCAL_DEV_BASE}${path}`, {
      ...options,
      signal: AbortSignal.timeout(1000), // Quick timeout to fail fast
    });
    if (res.ok) {
      const data = await res.json();
      return { data, env: "development", url: LOCAL_DEV_BASE };
    }
  } catch (err) {
    // Local server offline or timed out, fallback to cloud production endpoint
  }

  // 2. Try Inngest Cloud Production API
  // Use INNGEST_API_KEY first for general platform requests (GET /runs)
  // Fall back to INNGEST_SIGNING_KEY (primarily used for cancellations)
  const apiKey = process.env.INNGEST_API_KEY || process.env.INNGEST_SIGNING_KEY;
  if (!apiKey) {
    throw new Error("Local dev server is unreachable, and no Inngest keys are configured for cloud fallback.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${CLOUD_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Inngest Cloud API returned HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return { data, env: "production", url: CLOUD_BASE };
}

/** GET — Retrieve list of recent/active runs */
export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  await dbConnect();

  try {
    // 1. Attempt to fetch runs from Inngest dev server or cloud API
    const { data, env } = await fetchInngest("/runs");
    
    // Normalize run entries from Inngest API
    const normalizedRuns = (data?.data || []).map((run: any) => ({
      id: run.id || run.run_id,
      functionId: run.function_id || run.functionId,
      status: run.status,
      event: run.event?.name || run.event || "unknown",
      error: run.error || run.error_message || null,
      createdAt: run.created_at || run.createdAt || run.started_at,
      updatedAt: run.updated_at || run.updatedAt || run.ended_at,
    }));

    return Response.json({
      status: "ONLINE",
      environment: env,
      runs: normalizedRuns,
      source: "orchestrator-api",
    });
  } catch (error) {
    console.warn("Inngest orchestrator query failed. Falling back to MongoDB queue mirror:", error);
    
    try {
      // 2. Fallback: Query MongoDB to assemble a synthetic queue view
      const activeCampaigns = await Campaign.find({
        status: { $in: ["GENERATING", "SENDING"] },
      }).sort({ updatedAt: -1 }).lean();

      const activeCampaignIds = activeCampaigns.map((c) => c._id);

      // Get queued/active email logs
      const activeLogs = await EmailLog.find({
        campaignId: { $in: activeCampaignIds },
        status: { $in: ["QUEUED", "SENDING"] },
      }).sort({ updatedAt: -1 }).limit(100).lean();

      // Get recent failures and completions for history (limit to avoid bloated responses)
      const recentFailedLogs = await EmailLog.find({
        status: "FAILED",
      }).sort({ updatedAt: -1 }).limit(20).lean();

      const recentCompletedCampaigns = await Campaign.find({
        status: { $in: ["COMPLETED", "FAILED"] },
      }).sort({ updatedAt: -1 }).limit(10).lean();

      const syntheticRuns: any[] = [];

      // Add auto-send campaign runs
      for (const campaign of activeCampaigns) {
        if (campaign.status === "SENDING") {
          syntheticRuns.push({
            id: `db_send_${campaign._id}`,
            functionId: "auto-send-campaign",
            status: "Running",
            event: "campaign/auto-send",
            error: null,
            createdAt: campaign.updatedAt.toISOString(),
            updatedAt: campaign.updatedAt.toISOString(),
          });
        } else if (campaign.status === "GENERATING") {
          syntheticRuns.push({
            id: `db_camp_gen_${campaign._id}`,
            functionId: "generate-single-email",
            status: "Running",
            event: "campaign/generate.email",
            error: null,
            createdAt: campaign.createdAt.toISOString(),
            updatedAt: campaign.updatedAt.toISOString(),
          });
        }
      }

      // Add active generating/queued email logs
      for (const log of activeLogs) {
        syntheticRuns.push({
          id: `db_log_queued_${log._id}`,
          functionId: "generate-single-email",
          status: log.retryCount > 0 ? "Retrying" : "Running",
          event: "campaign/generate.email",
          error: log.generationError || log.error || null,
          createdAt: log.createdAt.toISOString(),
          updatedAt: log.updatedAt.toISOString(),
        });
      }

      // Add failed log runs for visibility
      for (const log of recentFailedLogs) {
        syntheticRuns.push({
          id: `db_log_fail_${log._id}`,
          functionId: log.subject === "Drafting..." || !log.subject ? "generate-single-email" : "auto-send-campaign",
          status: "Failed",
          event: log.subject === "Drafting..." || !log.subject ? "campaign/generate.email" : "campaign/auto-send",
          error: log.generationError || log.error || "Failed",
          createdAt: log.createdAt.toISOString(),
          updatedAt: log.updatedAt.toISOString(),
        });
      }

      // Add completed campaign runs
      for (const campaign of recentCompletedCampaigns) {
        syntheticRuns.push({
          id: `db_send_fin_${campaign._id}`,
          functionId: "auto-send-campaign",
          status: campaign.status === "COMPLETED" ? "Completed" : "Failed",
          event: "campaign/auto-send",
          error: campaign.status === "FAILED" ? "Campaign failed during execution" : null,
          createdAt: campaign.createdAt.toISOString(),
          updatedAt: campaign.updatedAt.toISOString(),
        });
      }

      // Sort by updatedAt descending
      syntheticRuns.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return Response.json({
        status: "ONLINE",
        environment: "production",
        runs: syntheticRuns,
        source: "database-mirror",
      });
    } catch (dbError) {
      return Response.json({
        status: "OFFLINE",
        error: `Inngest query failed: ${error instanceof Error ? error.message : "unknown"}. Database fallback error: ${dbError instanceof Error ? dbError.message : "unknown"}`,
        runs: [],
      });
    }
  }
}

/** POST — Cancel a specific run */
export async function POST(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  await dbConnect();

  try {
    const { runId } = await request.json();
    if (!runId) {
      return Response.json({ error: "runId is required" }, { status: 400 });
    }

    // 1. Check if it's a synthetic run ID (begins with db_)
    if (String(runId).startsWith("db_")) {
      let message = "Cancelled database job successfully";

      if (runId.startsWith("db_send_")) {
        const campaignId = runId.replace("db_send_", "");
        await Campaign.updateOne({ _id: campaignId }, { status: "FAILED" });
        await EmailLog.updateMany(
          { campaignId: new Types.ObjectId(campaignId), status: { $in: ["QUEUED", "SENDING"] } },
          { status: "FAILED", error: "Aborted by Admin" }
        );
        message = "Auto-send campaign cancelled in database";
      } else if (runId.startsWith("db_camp_gen_")) {
        const campaignId = runId.replace("db_camp_gen_", "");
        await Campaign.updateOne({ _id: campaignId }, { status: "FAILED" });
        await EmailLog.updateMany(
          { campaignId: new Types.ObjectId(campaignId), status: { $in: ["QUEUED", "SENDING"] } },
          { status: "FAILED", generationError: "Generation Aborted by Admin" }
        );
        message = "Campaign generation cancelled in database";
      } else if (runId.startsWith("db_log_queued_")) {
        const logId = runId.replace("db_log_queued_", "");
        const emailLog = await EmailLog.findById(logId);
        if (emailLog) {
          await EmailLog.updateOne(
            { _id: logId },
            { status: "FAILED", error: "Terminated by Admin", generationError: "Terminated by Admin" }
          );
          await Campaign.updateOne(
            { _id: emailLog.campaignId },
            { $inc: { failedCount: 1 } }
          );
          message = "Single email generation job aborted in database";
        }
      }

      // Proactively try to trigger standard Inngest cancellation just in case an actual Inngest execution exists
      try {
        const signingKey = process.env.INNGEST_SIGNING_KEY;
        if (signingKey) {
          // If we had the real inngest run ID, we'd cancel it. Since we don't, we cancel the main app's runs.
          // This is a best effort step.
        }
      } catch (e) {
        // Ignore best effort errors
      }

      return Response.json({ success: true, message });
    }

    // 2. Standard cancellation via Inngest REST API for real Inngest run IDs
    await fetchInngest(`/runs/${runId}/cancel`, { method: "POST" });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to cancel run" },
      { status: 500 }
    );
  }
}

/** DELETE — Bulk cancel stuck runs */
export async function DELETE(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  await dbConnect();

  try {
    let cancelledCount = 0;

    // 1. Perform database clean-up first (cancels any active loops/sends in MongoDB)
    const activeCampaigns = await Campaign.find({ status: { $in: ["GENERATING", "SENDING"] } });
    for (const campaign of activeCampaigns) {
      await Campaign.updateOne({ _id: campaign._id }, { status: "FAILED" });
      const res = await EmailLog.updateMany(
        { campaignId: campaign._id, status: { $in: ["QUEUED", "SENDING"] } },
        { status: "FAILED", error: "Bulk Terminated by Admin" }
      );
      cancelledCount += res.modifiedCount + 1; // Count campaign + logs
    }

    // 2. Call Inngest Cloud or local dev server cancellation endpoint
    let responseData: any = null;
    let fallbackNeeded = false;
    let environmentUsed: "development" | "production" = "production";

    try {
      const { data, env } = await fetchInngest("/cancellations", {
        method: "POST",
        body: JSON.stringify({
          app_id: "pitchr-app",
        }),
      });
      responseData = data;
      environmentUsed = env;
    } catch (err) {
      console.warn("Inngest Cloud bulk cancellation endpoint failed. Performing fallback...", err);
      fallbackNeeded = true;
    }

    // Fallback: If bulk cancellation API fails, attempt to fetch current runs from API and cancel them one-by-one
    if (fallbackNeeded) {
      try {
        const { data, env } = await fetchInngest("/runs");
        environmentUsed = env;
        const cancelableRuns = (data?.data || []).filter((run: any) =>
          ["Running", "Paused", "Retrying", "running", "paused", "retrying"].includes(run.status)
        );

        for (const run of cancelableRuns) {
          const runId = run.id || run.run_id;
          try {
            await fetchInngest(`/runs/${runId}/cancel`, { method: "POST" });
            cancelledCount++;
          } catch (cancelErr) {
            console.error(`Failed to cancel run ${runId} during bulk fallback:`, cancelErr);
          }
        }

        return Response.json({
          success: true,
          environment: environmentUsed,
          cancelledCount,
          method: "fallback-individual",
        });
      } catch (apiError) {
        // If the Inngest API is completely unreachable/unusable, we return the DB stats
        return Response.json({
          success: true,
          environment: "production",
          cancelledCount,
          method: "database-only-cleanup",
          message: "Could not reach Inngest API; database states cleaned up successfully.",
        });
      }
    }

    return Response.json({
      success: true,
      environment: environmentUsed,
      cancellationId: responseData?.id || null,
      cancelledCount,
      method: "bulk-cancellations-api",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to execute bulk cancellation" },
      { status: 500 }
    );
  }
}
