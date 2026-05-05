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
}

export interface IResume {
  fileName: string;
  base64Data: string;
  parsedText: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  emailVerified: Date | null;
  image: string;
  apiKeys: IApiKey[];
  selectedModel: string;
  gmailConfig: IGmailConfig | null;
  resume: IResume | null;
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

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Date, default: null },
    image: { type: String, default: "" },
    apiKeys: { type: [ApiKeySchema], default: [] },
    selectedModel: { type: String, default: DEFAULT_MODEL.id },
    gmailConfig: { type: GmailConfigSchema, default: null },
    resume: { type: ResumeSchema, default: null },
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

const User = models.User || model<IUser>("User", UserSchema);

export default User;
