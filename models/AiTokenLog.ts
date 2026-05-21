import { Schema, model, models, type Document } from "mongoose";

export interface IAiTokenLog extends Document {
  userId?: Schema.Types.ObjectId;
  campaignId?: Schema.Types.ObjectId;
  provider: "gemini" | "nvidia" | "claude";
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  apiKeyId?: Schema.Types.ObjectId;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
  createdAt: Date;
}

const AiTokenLogSchema = new Schema<IAiTokenLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", index: true },
    provider: { type: String, required: true, enum: ["gemini", "nvidia", "claude"], index: true },
    modelId: { type: String, required: true, index: true },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    apiKeyId: { type: Schema.Types.ObjectId, ref: "SystemApiKey", index: true },
    status: { type: String, required: true, enum: ["SUCCESS", "FAILED"], index: true },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const AiTokenLog = models.AiTokenLog || model<IAiTokenLog>("AiTokenLog", AiTokenLogSchema);
export default AiTokenLog;
