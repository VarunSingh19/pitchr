import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import EmailLog from "@/models/EmailLog";

/**
 * POST /api/leads/check-sent
 * Accepts { emails: string[] } and returns which ones this user
 * has already sent to (status SENT or BOUNCED).
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return Response.json({ alreadySent: [] });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Find all recipient emails this user has already sent to
    const sentEmails: string[] = await EmailLog.find({
      userId: user._id,
      recipientEmail: { $in: emails.map((e: string) => e.toLowerCase()) },
      status: { $in: ["SENT", "BOUNCED"] },
    }).distinct("recipientEmail");

    return Response.json({ alreadySent: sentEmails });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Check failed: ${message}` },
      { status: 500 }
    );
  }
}
