import mongoose, { Schema, model, models, type Document } from "mongoose";
import { encrypt, isEncrypted } from "@/lib/encryption";
import { DEFAULT_MODEL } from "@/lib/models-config";

export interface IApiKey {
  provider: "gemini" | "nvidia" | "claude";
  key: string;
  label: string;
  isDefault: boolean;
  addedAt: Date;
}

export interface IGmailConfig {
  address: string;
  appPassword: string;
  validated: boolean;
  lastSyncDate?: Date;
}

export interface IResume {
  fileName: string;
  base64Data: string;
  parsedText: string;
}

export interface IPromptConfig {
  targetGeography: string;
  targetRoles: string[];
  targetStack: string[];
  companyTypes: string[];
  minJobAgeDays: number;
  researcherLocation: string;
  hasConfigured?: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  emailVerified: Date | null;
  image: string;
  role: "user" | "admin";
  plan: "free" | "starter" | "pro" | "enterprise";
  planExpiresAt: Date | null;
  /** @deprecated — System-managed keys via SystemApiKey model. Stop reading/writing. Will be removed after migration. */
  apiKeys: IApiKey[];
  selectedModel: string;
  gmailConfig: IGmailConfig | null;
  resume: IResume | null;
  promptConfig: IPromptConfig;
  lastLoginAt?: Date;
  quotas?: {
    emailsPerDay: number;
    emailsPerMonth: number;
    maxCampaigns: number;
    allowedModels: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    provider: {
      type: String,
      enum: ["gemini", "nvidia", "claude"],
      default: "gemini",
      required: true,
    },
    key: { type: String, required: true },
    label: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const GmailConfigSchema = new Schema<IGmailConfig>(
  {
    address: { type: String, default: "" },
    appPassword: { type: String, default: "" },
    validated: { type: Boolean, default: false },
    lastSyncDate: { type: Date },
  },
  { _id: false }
);

const ResumeSchema = new Schema<IResume>(
  {
    fileName: { type: String, required: true },
    base64Data: { type: String, required: true },
    parsedText: { type: String, required: true },
  },
  { _id: false }
);

const PromptConfigSchema = new Schema<IPromptConfig>(
  {
    targetGeography: {
      type: String,
      default: "Mumbai — specifically Malad and Andheri areas (also accept nearby: Goregaon, Jogeshwari, MIDC, SV Road, WEH, Link Road corridors)",
    },
    targetRoles: {
      type: [String],
      default: ["Full Stack Developer", "React Developer", "Node.js Developer", "MERN Stack Developer"],
    },
    targetStack: {
      type: [String],
      default: ["React", "Node.js", "MongoDB", "Express", "JavaScript", "TypeScript"],
    },
    companyTypes: {
      type: [String],
      default: ["Product startups", "IT services firms", "SaaS companies", "agencies actively posting jobs"],
    },
    minJobAgeDays: { type: Number, default: 90 },
    researcherLocation: { type: String, default: "Mumbai, Maharashtra" },
    hasConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Date, default: null },
    image: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    plan: { type: String, enum: ["free", "starter", "pro", "enterprise"], default: "free" },
    planExpiresAt: { type: Date, default: null },
    /** @deprecated — Kept for backward compat. Do NOT read/write. Run migrate-remove-user-api-keys.js after confirming new system works. */
    apiKeys: { type: [ApiKeySchema], default: [] },
    selectedModel: { type: String, default: DEFAULT_MODEL.id },
    gmailConfig: { type: GmailConfigSchema, default: null },
    resume: { type: ResumeSchema, default: null },
    promptConfig: { type: PromptConfigSchema, default: () => ({}) },
    lastLoginAt: { type: Date },
    quotas: {
      type: {
        emailsPerDay: { type: Number, default: 10 },
        emailsPerMonth: { type: Number, default: 100 },
        maxCampaigns: { type: Number, default: 3 },
        allowedModels: { type: [String], default: ["gemini-2.5-flash"] },
      },
      default: () => ({
        emailsPerDay: 10,
        emailsPerMonth: 100,
        maxCampaigns: 3,
        allowedModels: ["gemini-2.5-flash"],
      }),
    },
  },
  { timestamps: true }
);

/**
 * Pre-save hook: encrypt API keys and Gmail app password before writing to MongoDB.
 * Only encrypts if the value is not already encrypted (idempotent).
 */
UserSchema.pre("save", async function () {
  // Encrypt API keys
  if (this.apiKeys && this.apiKeys.length > 0) {
    for (const apiKey of this.apiKeys) {
      if (apiKey.key && !isEncrypted(apiKey.key)) {
        apiKey.key = encrypt(apiKey.key);
      }
    }
  }

  // Encrypt Gmail app password
  if (this.gmailConfig?.appPassword && !isEncrypted(this.gmailConfig.appPassword)) {
    this.gmailConfig.appPassword = encrypt(this.gmailConfig.appPassword);
  }
});

// Force re-compilation if the cached model in mongoose.models is missing the "plan" schema path
if (models.User && !models.User.schema.paths.plan) {
  console.log("[Mongoose] Re-compiling User model to apply plan schema fields.");
  delete models.User;
}

const User = models.User || model<IUser>("User", UserSchema);

export default User;
