import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Reply from "@/models/Reply";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    
    if (!user || !user.gmailConfig?.address || !user.gmailConfig?.appPassword) {
      return Response.json({ error: "Gmail not configured" }, { status: 400 });
    }

    // Instantly fetch persisted replies from the DB, strictly filtering out any bounces
    const replies = await Reply.find({ 
      userId: user._id,
      recipientEmail: { $not: /mailer-daemon/i },
      subject: { $not: /delivery status notification|undeliverable/i }
    })
      .sort({ date: -1 })
      .lean();

    // Map _id to id for the frontend
    const formattedReplies = replies.map(r => ({
      ...r,
      id: r._id.toString(),
      _id: undefined,
    }));

    return Response.json({ replies: formattedReplies });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Inbox fetch failed: ${message}` }, { status: 500 });
  }
}
