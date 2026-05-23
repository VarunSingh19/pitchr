export interface PlanDetails {
  name: string;
  price: number;
  maxCampaigns: number;
  emailsPerDay: number;
  emailsPerMonth: number;
  allowedModels: string[];
}

export const PLAN_CONFIGS: Record<string, PlanDetails> = {
  free: {
    name: "Free Trial",
    price: 0,
    maxCampaigns: 3,
    emailsPerDay: 10,
    emailsPerMonth: 100,
    allowedModels: ["gemini-2.5-flash"],
  },
  starter: {
    name: "Starter",
    price: 199,
    maxCampaigns: 15,
    emailsPerDay: 100,
    emailsPerMonth: 2000,
    allowedModels: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
  },
  pro: {
    name: "Pro Outbound",
    price: 599,
    maxCampaigns: 50,
    emailsPerDay: 500,
    emailsPerMonth: 10000,
    allowedModels: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "meta/llama-3.1-8b-instruct",
      "meta/llama-3.1-70b-instruct",
      "nvidia/nemotron-3-nano-30b-a3b",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 999,
    maxCampaigns: 9999,
    emailsPerDay: 2000,
    emailsPerMonth: 50000,
    allowedModels: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "meta/llama-3.3-70b-instruct",
      "meta/llama-3.1-8b-instruct",
      "meta/llama-3.1-70b-instruct",
      "deepseek-ai/deepseek-r1",
      "mistralai/mistral-large-2",
      "qwen/qwen2.5-72b-instruct",
      "nvidia/nemotron-3-nano-30b-a3b",
    ],
  },
};
