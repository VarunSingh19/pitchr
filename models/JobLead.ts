import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IJobLead extends Document {
  searchQuery: string;
  normalizedQuery: string;
  source: "jooble" | "adzuna" | "indeed" | "naukri" | "shine" | "internshala" | "unknown";
  jobTitle: string;
  companyName: string;
  website: string | null;
  location: string;
  area: string | null;
  description: string;
  contactEmail: string | null;
  emailSource: string | null;
  emailVerified: boolean;
  fitScore: string | null;
  postingDate: Date;
  jobUrl: string;
  status: "discovered" | "imported" | "ignored";
  createdAt: Date;
}

const JobLeadSchema = new Schema<IJobLead>(
  {
    searchQuery: { type: String, required: true, index: true },
    normalizedQuery: { type: String, default: "", index: true },
    source: { type: String, required: true, default: "unknown" },
    jobTitle: { type: String, required: true },
    companyName: { type: String, required: true, index: true },
    website: { type: String, default: null },
    location: { type: String, required: true },
    area: { type: String, default: null },
    description: { type: String, required: true },
    contactEmail: { type: String, default: null },
    emailSource: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },
    fitScore: { type: String, default: null },
    postingDate: { type: Date, required: true },
    jobUrl: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["discovered", "imported", "ignored"],
      default: "discovered",
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

const JobLead = models.JobLead || model<IJobLead>("JobLead", JobLeadSchema);

export default JobLead;
