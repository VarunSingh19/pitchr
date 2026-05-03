import { Schema, model, models, type Document, Types } from "mongoose";

export interface ICampaign extends Document {
  userId: Types.ObjectId;
  name: string;
  leadsCount: number;
  sentCount: number;
  failedCount: number;
  status: "draft" | "generating" | "reviewing" | "sending" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    leadsCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "generating", "reviewing", "sending", "completed"],
      default: "draft",
    },
  },
  { timestamps: true }
);

// Compound index for efficient dashboard queries: user's campaigns sorted by newest first
CampaignSchema.index({ userId: 1, createdAt: -1 });

const Campaign =
  models.Campaign || model<ICampaign>("Campaign", CampaignSchema);

export default Campaign;
