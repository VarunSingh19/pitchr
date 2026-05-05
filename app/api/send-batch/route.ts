import { createTransporter, sendEmail } from "@/lib/mailer";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
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

    // If resumeBase64 is not provided, it means we should use the saved resume from disk
    if (!resumeBase64 && user.resume?.filePath) {
      try {
        const fileBuffer = await require('fs').promises.readFile(user.resume.filePath);
        resumeBase64 = fileBuffer.toString('base64');
        resumeFileName = user.resume.fileName;
      } catch (err) {
        return Response.json({ error: "Failed to read saved resume file" }, { status: 500 });
      }
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
            await sendEmail({
              transporter,
              from: fromAddress,
              to: company.contactEmail,
              cc: company.altEmail || undefined,
              subject: company.subject,
              body: company.body,
              resumeBase64,
              resumeFileName,
            });

            sendEvent({
              type: "status",
              companyId: company.companyId,
              status: "sent",
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Send failed";
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
