import { Schema, model, models, type Document } from "mongoose";
import { encrypt, isEncrypted } from "@/lib/encryption";

export interface ISystemApiKey extends Document {
  provider: "gemini" | "nvidia" | "claude";
  key: string;
  label: string;
  supportedModels: string[];
  isActive: boolean;
  usageCount: number;
  lastUsedAt: Date;
  rateLimitedUntil: Date | null;
  consecutiveFailures: number;
  averageLatencyMs: number;
  lastError: string;
  latencyHistory: number[];
  createdAt: Date;
  updatedAt: Date;
}

const SystemApiKeySchema = new Schema<ISystemApiKey>(
  {
    provider: {
      type: String,
      enum: ["gemini", "nvidia", "claude"],
      required: true,
    },
    key: { type: String, required: true },
    label: { type: String, default: "" },
    supportedModels: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: new Date(0) }, // epoch — ensures brand-new keys are selected first
    rateLimitedUntil: { type: Date, default: null },
    consecutiveFailures: { type: Number, default: 0 },
    averageLatencyMs: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
    latencyHistory: { type: [Number], default: [] },
  },
  { timestamps: true }
);

// Index for the LRU atomic query: active keys sorted by lastUsedAt
SystemApiKeySchema.index(
  { isActive: 1, supportedModels: 1, lastUsedAt: 1 },
  { name: "lru_key_selection" }
);

/**
 * Pre-save hook: encrypt the API key before writing to MongoDB.
 * Only encrypts if the value is not already encrypted (idempotent).
 */
SystemApiKeySchema.pre("save", async function () {
  if (this.key && !isEncrypted(this.key)) {
    this.key = encrypt(this.key);
  }
});

const SystemApiKey =
  models.SystemApiKey ||
  model<ISystemApiKey>("SystemApiKey", SystemApiKeySchema);

export default SystemApiKey;
