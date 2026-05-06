import { Schema, model, models, type Document, Types } from "mongoose";

export interface IReply extends Document {
  userId: Types.ObjectId;
  messageId: string;
  imapUid: string;
  companyName: string;
  recipientEmail: string;
  subject: string;
  snippet: string;
  bodyHtml: string;
  bodyText: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema = new Schema<IReply>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messageId: { type: String, required: true },
    imapUid: { type: String, required: true }, // The IMAP UID to prevent duplicates
    companyName: { type: String, required: true },
    recipientEmail: { type: String, required: true },
    subject: { type: String, required: true },
    snippet: { type: String, required: true },
    bodyHtml: { type: String },
    bodyText: { type: String },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

ReplySchema.index({ userId: 1, date: -1 });
ReplySchema.index({ userId: 1, imapUid: 1 }, { unique: true }); // Prevent duplicate syncs

const Reply = models.Reply || model<IReply>("Reply", ReplySchema);

export default Reply;
