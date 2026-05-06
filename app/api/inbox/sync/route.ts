import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import EmailLog from "@/models/EmailLog";
import Reply from "@/models/Reply";
import { decrypt } from "@/lib/encryption";

export async function POST() {
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

    // 1. Fetch all known sent message IDs (our zero-knowledge bound)
    const logs = await EmailLog.find({ userId: user._id, status: "SENT", messageId: { $exists: true } }).lean();
    const validMessageIds = logs.map(l => l.messageId);

    if (validMessageIds.length === 0) {
      return Response.json({ message: "No campaigns sent yet." });
    }

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
    let newlySyncedCount = 0;

    try {
      // Create a search criteria. If we synced before, only check new emails.
      // Since IMAP search by In-Reply-To requires querying each messageId or fetching headers,
      // it's faster to fetch messages since the last sync date.
      
      const lastSyncDate = user.gmailConfig.lastSyncDate;
      const searchCriteria: any = {};
      
      if (lastSyncDate) {
        // IMAP uses 'since' with dates. We subtract 1 day just to be safe with timezones
        const sinceDate = new Date(lastSyncDate.getTime() - 24 * 60 * 60 * 1000);
        searchCriteria.since = sinceDate;
      } else {
        // If first sync, just fetch ALL.
        searchCriteria.all = true;
      }

      // We fetch only the 'in-reply-to' and 'message-id' headers first to be extremely fast and avoid downloading bodies
      const fetchedIds: { uid: number, inReplyTo: string | undefined }[] = [];
      
      for await (const message of client.fetch(searchCriteria, { envelope: true })) {
        const inReplyTo = message.envelope?.inReplyTo;
        if (inReplyTo && validMessageIds.includes(inReplyTo)) {
          fetchedIds.push({ uid: message.uid, inReplyTo });
        }
      }

      // Now fetch bodies only for the matched UIDs
      for (const match of fetchedIds) {
        // Check if we already have this UID in the DB to prevent duplicates
        const existingReply = await Reply.findOne({ userId: user._id, imapUid: match.uid.toString() });
        if (existingReply) continue; // Skip already synced

        // Download full message
        const msg = await client.fetchOne(match.uid.toString(), { source: true }, { uid: true });
        if (!msg) continue;

        const parsed = await simpleParser(msg.source);
        const log = logs.find((l: any) => l.messageId === match.inReplyTo);

        const isBounce = 
          parsed.from?.value[0]?.address?.includes('mailer-daemon') ||
          parsed.subject?.toLowerCase().includes('delivery status notification') ||
          parsed.subject?.toLowerCase().includes('undeliverable');

        if (isBounce) {
          // Update EmailLog to BOUNCED
          await EmailLog.updateOne(
            { messageId: match.inReplyTo },
            { $set: { status: "BOUNCED", error: "Delivery Status Notification (Failure)" } }
          );
          
          // Delete it from Reply collection if it was accidentally saved before
          await Reply.deleteOne({ imapUid: match.uid.toString() });
          
          continue; // Do not save as a real reply
        }

        // Save to DB
        await Reply.create({
          userId: user._id,
          messageId: match.inReplyTo,
          imapUid: match.uid.toString(),
          companyName: log ? log.companyName : 'Unknown Company',
          recipientEmail: parsed.from?.value[0]?.address || 'unknown',
          subject: parsed.subject || 'No Subject',
          snippet: parsed.text ? parsed.text.substring(0, 100) + '...' : '',
          bodyHtml: parsed.html || '',
          bodyText: parsed.text || '',
          date: parsed.date || new Date(),
        });
        
        newlySyncedCount++;
      }

    } finally {
      lock.release();
    }
    
    await client.logout();
    
    // Update last sync date
    await User.updateOne(
      { _id: user._id },
      { $set: { "gmailConfig.lastSyncDate": new Date() } }
    );

    return Response.json({ success: true, newlySyncedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Sync failed: ${message}` }, { status: 500 });
  }
}
