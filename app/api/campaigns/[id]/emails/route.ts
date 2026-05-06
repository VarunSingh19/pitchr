import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import EmailLog from "@/models/EmailLog";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const logs = await EmailLog.find({ campaignId: id }).sort({ createdAt: 1 });

    // Map to the frontend type GeneratedEmail
    const emails = logs.map(log => ({
      companyId: log._id.toString(),
      company: log.companyName,
      role: log.role || "Role", // Fallback if not stored in log
      contactEmail: log.recipientEmail,
      subject: log.subject,
      body: log.body,
      status: log.status === "GENERATED" ? "ready" : log.status.toLowerCase(),
      selected: true,
      error: log.generationError
    }));

    return Response.json(emails);
  } catch (error) {
    return Response.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}
