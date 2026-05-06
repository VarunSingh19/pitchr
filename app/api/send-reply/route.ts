import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { createTransporter } from "@/lib/mailer";
import { decrypt } from "@/lib/encryption";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, to, subject, messageId, attachExistingResume, customResumeBase64, customResumeName } = await request.json();
    if (!text || !to || !subject || !messageId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user || !user.gmailConfig?.address || !user.gmailConfig?.appPassword) {
      return Response.json({ error: "Gmail not configured" }, { status: 400 });
    }

    const senderEmail = user.gmailConfig.address;
    const appPassword = decrypt(user.gmailConfig.appPassword);
    const senderName = session.user.name || "Pitchr User";
    
    const transporter = createTransporter(senderEmail, appPassword);
    
    const mailOptions: nodemailer.SendMailOptions = {
      from: `${senderName} <${senderEmail}>`,
      to,
      subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
      text,
      inReplyTo: messageId,
      references: [messageId]
    };

    // Handle Attachments
    const attachments = [];
    if (customResumeBase64 && customResumeName) {
      const base64Data = customResumeBase64.split(';base64,').pop();
      attachments.push({
        filename: customResumeName,
        content: base64Data,
        encoding: 'base64'
      });
    } else if (attachExistingResume && user.resume?.base64Data) {
      attachments.push({
        filename: user.resume.fileName || 'Resume.pdf',
        content: user.resume.base64Data,
        encoding: 'base64'
      });
    }

    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);

    return Response.json({ success: true, messageId: info.messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Failed to send reply: ${message}` }, { status: 500 });
  }
}
