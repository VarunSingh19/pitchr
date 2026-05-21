import { Schema, model, models, type Document } from "mongoose";

export interface ISystemPrompt extends Document {
  promptId: string; // e.g. "email_system" | "subject_system" | "few_shots_email" | "few_shots_subject" | "blacklisted_words"
  name: string;
  content: string;
  description?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemPromptSchema = new Schema<ISystemPrompt>(
  {
    promptId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    content: { type: String, required: true },
    description: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const SystemPrompt = models.SystemPrompt || model<ISystemPrompt>("SystemPrompt", SystemPromptSchema);
export default SystemPrompt;
