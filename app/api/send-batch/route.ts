import { createTransporter, sendEmail } from "@/lib/mailer";
import { auth } from "@/auth";

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

    const {
      companies,
      senderName,
      senderEmail,
      appPassword,
      resumeBase64,
      resumeFileName,
    } = await request.json();

    if (!companies || !senderEmail || !appPassword) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create transporter and verify credentials first
    const transporter = createTransporter(senderEmail, appPassword);
    try {
      await transporter.verify();
    } catch {
      return Response.json(
        { error: "Invalid Gmail credentials. Check your App Password." },
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
