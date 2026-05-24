import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IUserSeenJobs extends Document {
  userId: mongoose.Types.ObjectId;
  normalizedQuery: string;
  seenJobUrls: string[];
  lastSeenAt: Date;
  createdAt: Date;
}

const UserSeenJobsSchema = new Schema<IUserSeenJobs>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    normalizedQuery: { type: String, required: true },
    seenJobUrls: { type: [String], default: [] },
    lastSeenAt: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

// Compound unique index — one document per user per normalized query
UserSeenJobsSchema.index({ userId: 1, normalizedQuery: 1 }, { unique: true });

// Auto-expire after 30 days (2592000 seconds)
UserSeenJobsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const UserSeenJobs =
  models.UserSeenJobs ||
  model<IUserSeenJobs>("UserSeenJobs", UserSeenJobsSchema);

export default UserSeenJobs;
