import { createTransporter, sendEmail } from "@/lib/mailer";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import EmailLog from "@/models/EmailLog";
import { decrypt } from "@/lib/encryption";

interface CompanyPayload {
  companyId: string | number;
  company: string;
  role: string;
  contactEmail: string;
  altEmail?: string;
  subject: string;
  body: string;
}

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let {
      companies,
      resumeBase64,
      resumeFileName,
    } = await request.json();

    if (!companies || companies.length === 0) {
      return Response.json(
        { error: "No companies to send to" },
        { status: 400 }
      );
    }

    // Load Gmail credentials from user's DB record
    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // If resumeBase64 is not provided, it means we should use the saved resume from the DB
    if (!resumeBase64 && user.resume?.base64Data) {
      resumeBase64 = user.resume.base64Data;
      resumeFileName = user.resume.fileName;
    }

    if (!user.gmailConfig?.address || !user.gmailConfig?.appPassword) {
      return Response.json(
        { error: "Gmail not configured. Go to Settings > Gmail Config." },
        { status: 400 }
      );
    }

    if (!user.gmailConfig.validated) {
      return Response.json(
        { error: "Gmail configuration has not been validated. Go to Settings > Gmail Config." },
        { status: 400 }
      );
    }

    // Decrypt the stored app password
    const senderEmail = user.gmailConfig.address;
    const appPassword = decrypt(user.gmailConfig.appPassword);
    const senderName = session.user.name || "Pitchr User";

    // Create transporter and verify credentials
    const transporter = createTransporter(senderEmail, appPassword);
    try {
      await transporter.verify();
    } catch {
      return Response.json(
        { error: "Gmail credentials expired or invalid. Update in Settings > Gmail Config." },
        { status: 401 }
      );
    }

    // Set up SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        const fromAddress = `${senderName} <${senderEmail}>`;
        const companyList = companies as CompanyPayload[];

        // Create Campaign record
        const campaign = new Campaign({
          userId: user._id,
          name: `Campaign ${new Date().toLocaleDateString()}`,
          leadsCount: companyList.length,
          sentCount: 0,
          failedCount: 0,
          status: "sending"
        });
        await campaign.save();

        for (let i = 0; i < companyList.length; i++) {
          const company = companyList[i];

          // Emit "sending" status
          sendEvent({
            type: "status",
            companyId: company.companyId,
            status: "sending",
            index: i,
            total: companyList.length,
          });

          try {
            const { messageId } = await sendEmail({
              transporter,
              from: fromAddress,
              to: company.contactEmail,
              cc: company.altEmail || undefined,
              subject: company.subject,
              body: company.body,
              resumeBase64,
              resumeFileName,
            });

            // Save success log
            await EmailLog.create({
              campaignId: campaign._id,
              userId: user._id,
              companyName: company.company,
              recipientEmail: company.contactEmail,
              subject: company.subject,
              body: company.body,
              status: "SENT",
              messageId
            });

            await Campaign.updateOne({ _id: campaign._id }, { $inc: { sentCount: 1 } });

            sendEvent({
              type: "status",
              companyId: company.companyId,
              status: "sent",
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Send failed";
            
            // Save failed log
            await EmailLog.create({
              campaignId: campaign._id,
              userId: user._id,
              companyName: company.company,
              recipientEmail: company.contactEmail,
              subject: company.subject,
              body: company.body,
              status: "FAILED",
              error: message
            });

            await Campaign.updateOne({ _id: campaign._id }, { $inc: { failedCount: 1 } });

            sendEvent({
              type: "status",
              companyId: company.companyId,
              status: "failed",
              error: message,
              timestamp: new Date().toISOString(),
            });
          }

          // Rate limiting: 4-second delay between sends (max 15 per minute)
          if (i < companyList.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 4000));
          }
        }

        await Campaign.updateOne({ _id: campaign._id }, { status: "completed" });

        // Final summary
        sendEvent({ type: "complete" });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Batch send failed: ${message}` },
      { status: 500 }
    );
  }
}
