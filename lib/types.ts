/** Shared TypeScript interfaces for the CEA app. */

export interface Lead {
  id: string | number;
  company: string;
  role: string;
  description: string;
  contact_email: string;
  alt_email?: string;
  website?: string;
  type?: string;
  stack?: string | string[];
  fit_score?: string | number;
  status?: string;
}

export interface GeneratedEmail {
  companyId: string | number;
  company: string;
  role: string;
  contactEmail: string;
  altEmail?: string;
  subject: string;
  body: string;
  status: "pending" | "generating" | "ready" | "failed";
  error?: string;
  selected: boolean;
}

export interface SendResult {
  companyId: string | number;
  company: string;
  role: string;
  email: string;
  subject: string;
  status: "queued" | "sending" | "sent" | "failed" | "skipped";
  error?: string;
  timestamp?: string;
}

export interface Credentials {
  fullName: string;
  gmailAddress: string;
  appPassword: string;
}

export interface DiscoveredJob {
  source: "jooble" | "adzuna" | "indeed" | "naukri" | "shine" | "internshala" | "unknown";
  jobTitle: string;
  companyName: string;
  location: string;
  description: string;
  postingDate: Date;
  jobUrl: string;
  website?: string | null;
  contactEmail?: string | null;
  emailVerified?: boolean;
}

