import nodemailer from "nodemailer";

/** Create a Gmail SMTP transporter using App Password */
export function createTransporter(email: string, appPassword: string) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: email,
      pass: appPassword,
    },
  });
}

interface SendEmailParams {
  transporter: nodemailer.Transporter;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  resumeBase64?: string;
  resumeFileName?: string;
}

/** Send a single email with optional resume attachment */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const mailOptions: nodemailer.SendMailOptions = {
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.body,
  };

  if (params.cc) {
    mailOptions.cc = params.cc;
  }

  if (params.resumeBase64) {
    mailOptions.attachments = [
      {
        filename: params.resumeFileName || "Resume.pdf",
        content: Buffer.from(params.resumeBase64, "base64"),
        contentType: "application/pdf",
      },
    ];
  }

  await params.transporter.sendMail(mailOptions);
}
