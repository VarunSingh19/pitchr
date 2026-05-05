import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import EmailLog from "@/models/EmailLog";
import { decrypt } from "@/lib/encryption";

export async function GET(request: Request) {
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

    // Since we need to install imapflow and mailparser, we return a clear error
    // or a mock for now so the UI doesn't crash if the dependencies are missing.
    // In a real scenario, this would use imapflow to search the inbox.
    
    // Fetch all sent message IDs from the DB to bound the search (Zero-Knowledge rule)
    const logs = await EmailLog.find({ userId: user._id, status: "SENT", messageId: { $exists: true } });
    const validMessageIds = logs.map(l => l.messageId);

    if (validMessageIds.length === 0) {
      return Response.json({ replies: [] });
    }

    // REAL IMPLEMENTATION (Requires imapflow & mailparser)
    
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ImapFlow } = require('imapflow');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { simpleParser } = require('mailparser');

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: user.gmailConfig.address,
        pass: decrypt(user.gmailConfig.appPassword)
      },
      logger: false
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const replies = [];

    try {
      // We only search for emails that are replies to our specific message IDs
      for (const messageId of validMessageIds) {
        // Find message by In-Reply-To header
        // This strictly bounds the search to ONLY campaign replies
        const searchCriteria = { header: { 'in-reply-to': messageId } };
        
        for await (const message of client.fetch(searchCriteria, { source: true, envelope: true })) {
          const parsed = await simpleParser(message.source);
          
          // Find the original log to correlate company name
          const log = logs.find((l: any) => l.messageId === messageId);
          
          replies.push({
            id: message.uid.toString(),
            messageId,
            companyName: log ? log.companyName : 'Unknown Company',
            recipientEmail: parsed.from?.value[0]?.address || 'unknown',
            subject: parsed.subject || 'No Subject',
            date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
            snippet: parsed.text ? parsed.text.substring(0, 100) + '...' : '',
            bodyHtml: parsed.html,
            bodyText: parsed.text
          });
        }
      }
    } finally {
      lock.release();
    }
    
    await client.logout();
    
    // Sort by newest
    replies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return Response.json({ replies });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Inbox sync failed: ${message}` }, { status: 500 });
  }
}
