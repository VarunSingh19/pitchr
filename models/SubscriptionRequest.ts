import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface ISubscriptionRequest extends Document {
  userId: mongoose.Types.ObjectId;
  plan: "starter" | "pro" | "enterprise";
  amount: number;
  transactionId: string;
  proofFilePath: string; // Stored relative path to the receipt file on disk
  proofFileName: string; // The original filename uploaded by the user
  status: "pending" | "approved" | "rejected";
  adminNotes: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionRequestSchema = new Schema<ISubscriptionRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: String, enum: ["starter", "pro", "enterprise"], required: true },
    amount: { type: Number, required: true },
    transactionId: { type: String, required: true, unique: true },
    proofFilePath: { type: String, required: true },
    proofFileName: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    adminNotes: { type: String, default: "" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// Unique index for fast transaction lookup and uniqueness enforcement
SubscriptionRequestSchema.index({ transactionId: 1 }, { unique: true });

export default models.SubscriptionRequest || model<ISubscriptionRequest>("SubscriptionRequest", SubscriptionRequestSchema);
