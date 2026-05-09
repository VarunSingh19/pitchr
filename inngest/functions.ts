import { inngest } from "./client";
import { pooledGenerateEmailBody, pooledGenerateSubjectLine } from "@/lib/ai-client";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import EmailLog from "@/models/EmailLog";
import Campaign from "@/models/Campaign";
import { Types } from "mongoose";
import { decrypt } from "@/lib/encryption";
import { createTransporter, sendEmail } from "@/lib/mailer";

export const generateSingleEmail = inngest.createFunction(
  {
    id: "generate-single-email",
    retries: 5,
    triggers: [{ event: "campaign/generate.email" }],
  },
  async ({ event, step }) => {
    const { campaignId, lead, userId, resumeText, userName } = event.data;

    const { logId, shouldAbort } = await step.run("upsert-email-log", async () => {
      await dbConnect();

      const filter = {
        campaignId: new Types.ObjectId(campaignId),
        recipientEmail: lead.contact_email,
        companyName: lead.company,
      };

      const existingLog = await EmailLog.findOne(filter);

      if (
        existingLog &&
        ["GENERATED", "SENT", "QUEUED", "SENDING"].includes(existingLog.status)
      ) {
        return { logId: existingLog._id.toString(), shouldAbort: true };
      }

      if (existingLog) {
        await EmailLog.findByIdAndUpdate(existingLog._id, {
          status: "QUEUED",
          generationError: null,
        });
        return { logId: existingLog._id.toString(), shouldAbort: false };
      }

      const newLog = await EmailLog.findOneAndUpdate(
        filter,
        {
          $setOnInsert: {
            campaignId: new Types.ObjectId(campaignId),
            userId: new Types.ObjectId(userId),
            companyName: lead.company,
            role: lead.role,
            recipientEmail: lead.contact_email,
            subject: "Drafting...",
            body: "Drafting...",
            status: "QUEUED",
            retryCount: 0,
          },
        },
        { upsert: true, returnDocument: "after" }
      );

      return { logId: newLog._id.toString(), shouldAbort: false };
    });

    if (shouldAbort) {
      return { message: "Already generated or in progress", logId };
    }

    // Fetch the user's selected model — the key comes from the system pool
    const modelId = await step.run("fetch-user-model", async () => {
      await dbConnect();

      const user = await User.findById(userId).select("selectedModel").lean();
      if (!user) throw new Error("User not found");

      return user.selectedModel || "gemini-2.5-flash";
    });

    const body = await step.run("generate-email-body", async () => {
      const stackStr = Array.isArray(lead.stack)
        ? lead.stack.join(", ")
        : lead.stack || "Not specified";

      return pooledGenerateEmailBody(
        {
          userName,
          resumeText,
          company: lead.company,
          role: lead.role,
          description: lead.description || "",
          stack: stackStr,
          fitScore: String(lead.fit_score || ""),
        },
        modelId
      );
    });

    const subject = await step.run("generate-subject-line", async () => {
      const stackStr = Array.isArray(lead.stack)
        ? lead.stack.join(", ")
        : lead.stack || "Not specified";

      return pooledGenerateSubjectLine(
        lead.company,
        lead.role,
        stackStr,
        userName,
        modelId
      );
    });

    await step.run("save-generated-email", async () => {
      await dbConnect();

      await EmailLog.findByIdAndUpdate(logId, {
        subject,
        body,
        status: "GENERATED",
        generationError: null,
      });
    });

    // Check if all emails in this campaign are now done
    await step.run("check-campaign-complete", async () => {
      await dbConnect();

      const campaign = await Campaign.findById(campaignId);
      if (!campaign || campaign.status !== "GENERATING") return;

      const doneCount = await EmailLog.countDocuments({
        campaignId: new Types.ObjectId(campaignId),
        status: { $in: ["GENERATED", "FAILED", "SENT"] },
      });

      if (doneCount >= campaign.totalLeads) {
        if (campaign.autoSend) {
          // All generated + auto-send ON → trigger background send
          await Campaign.updateOne({ _id: campaignId }, { status: "SENDING" });
          await inngest.send({
            name: "campaign/auto-send",
            data: { campaignId, userId },
          });
        } else {
          // All generated + manual mode → mark READY for review
          await Campaign.updateOne({ _id: campaignId }, { status: "READY" });
        }
      }
    });

    return { success: true, logId };
  }
);

// ═══════════════════════════════════════════
// Auto Send Campaign — sends all generated emails
// in background when autoSend is enabled.
// ═══════════════════════════════════════════

export const autoSendCampaign = inngest.createFunction(
  {
    id: "auto-send-campaign",
    retries: 2,
    triggers: [{ event: "campaign/auto-send" }],
  },
  async ({ event, step }) => {
    const { campaignId, userId } = event.data;

    // Step 1: Load user credentials and generated emails
    const context = await step.run("load-send-context", async () => {
      await dbConnect();

      const user = await User.findById(userId);
      if (!user?.gmailConfig?.address || !user?.gmailConfig?.appPassword) {
        return { skip: true, reason: "Gmail not configured", senderEmail: "", appPassword: "", senderName: "", resumeBase64: "", resumeFileName: "", emails: [] as any[] };
      }

      if (!user.gmailConfig.validated) {
        return { skip: true, reason: "Gmail not validated", senderEmail: "", appPassword: "", senderName: "", resumeBase64: "", resumeFileName: "", emails: [] as any[] };
      }

      const emails = await EmailLog.find({
        campaignId: new Types.ObjectId(campaignId),
        status: "GENERATED",
      }).lean();

      return {
        skip: false,
        reason: "",
        senderEmail: user.gmailConfig.address as string,
        appPassword: decrypt(user.gmailConfig.appPassword) as string,
        senderName: (user.name || "Pitchr User") as string,
        resumeBase64: (user.resume?.base64Data || "") as string,
        resumeFileName: (user.resume?.fileName || "Resume.pdf") as string,
        emails: emails.map((e) => ({
          _id: e._id.toString(),
          recipientEmail: e.recipientEmail,
          companyName: e.companyName,
          role: e.role,
          subject: e.subject,
          body: e.body,
        })),
      };
    });

    if (context.skip) {
      await step.run("mark-failed", async () => {
        await dbConnect();
        await Campaign.updateOne({ _id: campaignId }, { status: "FAILED" });
      });
      return { success: false, reason: context.reason };
    }

    if (context.emails.length === 0) {
      await step.run("mark-completed-empty", async () => {
        await dbConnect();
        await Campaign.updateOne({ _id: campaignId }, { status: "COMPLETED" });
      });
      return { success: true, sent: 0, failed: 0 };
    }

    // Step 2: Send each email sequentially
    const sendResult = await step.run("send-all-emails", async () => {
      const transporter = createTransporter(context.senderEmail, context.appPassword);

      // Verify credentials first
      try {
        await transporter.verify();
      } catch {
        return { sent: 0, failed: context.emails.length, error: "Gmail credentials invalid" };
      }

      const fromAddress = `${context.senderName} <${context.senderEmail}>`;
      let sent = 0;
      let failed = 0;

      for (let i = 0; i < context.emails.length; i++) {
        const email = context.emails[i];

        try {
          const { messageId } = await sendEmail({
            transporter,
            from: fromAddress,
            to: email.recipientEmail,
            subject: email.subject,
            body: email.body,
            resumeBase64: context.resumeBase64 || undefined,
            resumeFileName: context.resumeFileName || undefined,
          });

          await EmailLog.updateOne(
            { _id: email._id },
            { $set: { status: "SENT", messageId, error: null } }
          );
          await Campaign.updateOne({ _id: campaignId }, { $inc: { sentCount: 1 } });
          sent++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Send failed";
          await EmailLog.updateOne(
            { _id: email._id },
            { $set: { status: "FAILED", error: errMsg } }
          );
          await Campaign.updateOne({ _id: campaignId }, { $inc: { failedCount: 1 } });
          failed++;
        }

        // Rate limiting: 4s delay between sends
        if (i < context.emails.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }
      }

      return { sent, failed };
    });

    // Step 3: Mark campaign completed and fire post-send events
    await step.run("finalize-campaign", async () => {
      await dbConnect();
      await Campaign.updateOne({ _id: campaignId }, { status: "COMPLETED" });

      // Fire delivery verification (5 min delay)
      await inngest.send({
        name: "campaign/verify.delivery",
        data: { campaignId, userId },
      });

      // Fire completion notification
      await inngest.send({
        name: "campaign/completed",
        data: { campaignId, userId },
      });
    });

    return { success: true, ...sendResult };
  }
);

// ═══════════════════════════════════════════
// Completion Notification — sends summary email
// to the user after any campaign finishes.
// Uses the SYSTEM Gmail from .env (not user's Gmail).
// ═══════════════════════════════════════════

export const sendCompletionEmail = inngest.createFunction(
  {
    id: "send-completion-email",
    retries: 3,
    triggers: [{ event: "campaign/completed" }],
  },
  async ({ event, step }) => {
    const { campaignId, userId } = event.data;

    await step.run("send-notification", async () => {
      await dbConnect();

      const systemEmail = process.env.GMAIL_USER;
      const systemPassword = process.env.GMAIL_USER_PASSWORD;

      if (!systemEmail || !systemPassword) {
        console.warn("[completion-email] GMAIL_USER or GMAIL_USER_PASSWORD not set in .env");
        return;
      }

      const user = await User.findById(userId);
      if (!user?.email) return;

      const campaign = await Campaign.findById(campaignId).lean();
      if (!campaign) return;

      const transporter = createTransporter(systemEmail, systemPassword);

      const totalLeads = campaign.totalLeads || campaign.leadsCount || 0;
      const bouncedCount = campaign.bouncedCount || 0;
      const deliveredCount = Math.max(0, (campaign.sentCount || 0) - bouncedCount);
      const failedCount = campaign.failedCount || 0;
      const successRate = totalLeads > 0 ? Math.round((deliveredCount / totalLeads) * 100) : 0;
      const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pitchr.app";

      const subject = `✅ Pitchr Campaign Complete — "${campaign.name}"`;

      const body = `Hi ${user.name || "there"},

Your campaign "${campaign.name}" has finished!

📊 Results:
• Total leads: ${totalLeads}
• Sent successfully: ${deliveredCount}
• Failed to send: ${failedCount}${bouncedCount > 0 ? `\n• Bounced back: ${bouncedCount}` : ""}
• Success rate: ${successRate}%

🔗 View full details:
${appUrl}/dashboard/history/${campaignId}

— Pitchr`;

      await transporter.sendMail({
        from: `Pitchr <${systemEmail}>`,
        to: user.email,
        subject,
        text: body,
      });
    });

    return { success: true };
  }
);

export const verifyDelivery = inngest.createFunction(
  {
    id: "verify-delivery",
    retries: 3,
    triggers: [{ event: "campaign/verify.delivery" }],
  },
  async ({ event, step }) => {
    const { campaignId, userId } = event.data;

    // Step 1: Wait 5 minutes for bounce emails to arrive in Gmail
    await step.sleep("wait-for-bounces", "5m");

    // Step 2: Fetch user credentials and sent messageIds
    const context = await step.run("fetch-context", async () => {
      await dbConnect();

      const user = await User.findById(userId);
      if (!user?.gmailConfig?.address || !user?.gmailConfig?.appPassword) {
        return { skip: true as const, reason: "Gmail not configured", gmailAddress: "", appPassword: "", messageIds: [] as string[] };
      }

      const sentLogs = await EmailLog.find({
        campaignId: new Types.ObjectId(campaignId),
        status: "SENT",
        messageId: { $exists: true, $ne: null },
      })
        .select("messageId recipientEmail")
        .lean();

      if (sentLogs.length === 0) {
        return { skip: true as const, reason: "No sent emails to verify", gmailAddress: "", appPassword: "", messageIds: [] as string[] };
      }

      return {
        skip: false as const,
        reason: "",
        gmailAddress: user.gmailConfig.address as string,
        appPassword: decrypt(user.gmailConfig.appPassword) as string,
        messageIds: sentLogs.map((l) => l.messageId) as string[],
      };
    });

    if (context.skip) {
      return { message: context.reason, bounced: 0 };
    }

    // Step 3: Connect to IMAP and check for bounces
    const bounceResult = await step.run("check-imap-bounces", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ImapFlow } = require("imapflow");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { simpleParser } = require("mailparser");

      const client = new ImapFlow({
        host: "imap.gmail.com",
        port: 993,
        secure: true,
        auth: {
          user: context.gmailAddress,
          pass: context.appPassword,
        },
        logger: false,
      });

      await client.connect();
      const lock = await client.getMailboxLock("INBOX");

      const bouncedMessageIds: string[] = [];

      try {
        // Search for recent emails (last 30 minutes to be safe)
        const since = new Date(Date.now() - 30 * 60 * 1000);

        for await (const message of client.fetch(
          { since },
          { envelope: true, source: true }
        )) {
          const inReplyTo = message.envelope?.inReplyTo;
          if (!inReplyTo || !context.messageIds!.includes(inReplyTo)) {
            continue;
          }

          // Parse the message to check if it's a bounce
          const parsed = await simpleParser(message.source);

          const isBounce =
            parsed.from?.value[0]?.address?.includes("mailer-daemon") ||
            parsed.subject
              ?.toLowerCase()
              .includes("delivery status notification") ||
            parsed.subject?.toLowerCase().includes("undeliverable") ||
            parsed.subject?.toLowerCase().includes("delivery incomplete") ||
            parsed.subject?.toLowerCase().includes("mail delivery failed") ||
            parsed.subject?.toLowerCase().includes("returned mail") ||
            parsed.headers?.get("content-type")?.includes("delivery-status");

          if (isBounce) {
            bouncedMessageIds.push(inReplyTo);
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();

      return { bouncedMessageIds };
    });

    // Step 4: Update database with bounce results
    const updateResult = await step.run("update-bounce-status", async () => {
      await dbConnect();

      const { bouncedMessageIds } = bounceResult;
      if (bouncedMessageIds.length === 0) {
        return { bounced: 0 };
      }

      // Update each bounced EmailLog
      const updateResult = await EmailLog.updateMany(
        {
          campaignId: new Types.ObjectId(campaignId),
          messageId: { $in: bouncedMessageIds },
          status: "SENT", // Only update if still marked as sent
        },
        {
          $set: {
            status: "BOUNCED",
            error: "Delivery Status Notification (Failure)",
          },
        }
      );

      const bouncedCount = updateResult.modifiedCount;

      // Update Campaign counts
      if (bouncedCount > 0) {
        await Campaign.updateOne(
          { _id: campaignId },
          {
            $inc: {
              sentCount: -bouncedCount,
              bouncedCount: bouncedCount,
            },
          }
        );
      }

      return { bounced: bouncedCount };
    });

    return {
      success: true,
      campaignId,
      bounced: updateResult.bounced,
    };
  }
);