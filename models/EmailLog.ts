import { Schema, model, models, type Document, Types } from "mongoose";

export interface IEmailLog extends Document {
  campaignId: Types.ObjectId;
  userId: Types.ObjectId;
  companyName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: "SENT" | "FAILED" | "BOUNCED" | "REPLIED";
  messageId?: string; // The SMTP message-id used to track replies
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyName: { type: String, required: true },
    recipientEmail: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: {
      type: String,
      enum: ["SENT", "FAILED", "BOUNCED", "REPLIED"],
      default: "SENT",
    },
    messageId: { type: String, index: true }, // Indexed for quick reply lookup
    error: { type: String },
  },
  { timestamps: true }
);

// Indexes
EmailLogSchema.index({ campaignId: 1 });
EmailLogSchema.index({ userId: 1, createdAt: -1 });

const EmailLog =
  models.EmailLog || model<IEmailLog>("EmailLog", EmailLogSchema);

export default EmailLog;
