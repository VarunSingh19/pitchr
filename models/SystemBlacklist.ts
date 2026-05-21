import { Schema, model, models, type Document } from "mongoose";

export interface ISystemBlacklist extends Document {
  domainOrEmail: string; // The email (e.g. competitor@company.com) or domain (e.g. gov.ru, competitor.com)
  addedBy: string; // Admin email who blacklisted it
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemBlacklistSchema = new Schema<ISystemBlacklist>(
  {
    domainOrEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    addedBy: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const SystemBlacklist =
  models.SystemBlacklist || model<ISystemBlacklist>("SystemBlacklist", SystemBlacklistSchema);

export default SystemBlacklist;
