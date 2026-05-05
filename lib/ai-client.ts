/**
 * Unified AI Client — Routes generation requests to the correct provider.
 * Supports: Google Gemini (SDK) and NVIDIA NIM (OpenAI-compatible REST).
 * 
 * All email generation logic lives here. API routes should call these functions
 * and never import provider-specific modules directly.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { nimChatCompletion } from "@/lib/nvidia-nim";
import { getProviderForModel, DEFAULT_MODEL } from "@/lib/models-config";

interface GenerateEmailParams {
  userName: string;
  resumeText: string;
  company: string;
  role: string;
  description: string;
  stack: string;
  fitScore: string;
}

// ─────────────────────────────────────────────
// FEW-SHOT REFERENCE EMAILS
// These train the AI on the exact tone, length,
// and structure we want. DO NOT remove them.
// ─────────────────────────────────────────────
const REFERENCE_EMAILS = `
=== REFERENCE EMAIL 1 (IoT / Supply Chain company) ===

Real-time visibility at supply chain scale is genuinely hard — the gap between sensor data and actionable insight is where most platforms fall short. I've been building in that gap.

I'm Varun Singh, a Full Stack Developer from Mumbai with 2 years of professional experience and 1 year of freelancing. I specialize in production-grade Node.js backends, React frontends, and Docker-based deployments — end to end.

Two projects directly relevant to your stack: At Zap Solutionz, I built Armorray (armorray.com), a live radiology SaaS featuring real-time Socket.IO communication, Redis caching for high-speed data retrieval, and Dockerized microservices behind an Nginx reverse proxy — exactly the kind of architecture that powers real-time IoT data at scale. I also engineered a CI/CD pipeline using GitHub Actions and Docker that cut deployment time by 85%, enabling zero-downtime releases across environments.

I'd welcome a 15-minute call to show you what I've shipped. My resume and portfolio are attached.

Varun Singh
+91 8433808081 | varunsinghh2409@gmail.com

=== REFERENCE EMAIL 2 (Fintech / SaaS company) ===

Financial platforms live or die on trust — one data inconsistency, one slow API call at the wrong moment, and the product breaks that trust permanently. I build the kind of backends that don't make that mistake.

I'm Varun Singh, a Full Stack Developer based in Mumbai with hands-on experience architecting and shipping full-stack fintech platforms from scratch.

Two things from my background that map directly to what you're building: I architected Armorray (armorray.com), a multi-tenant SaaS with role-based access control, automated subscription billing, and a PostgreSQL schema built for scale — the same fundamentals a financial platform needs. And at Bonum eDesign LLP, I built and hardened AWS Linux servers end-to-end, managed CI/CD pipelines, and delivered a full Django + React platform integrating six security engines — all in production, all under real load.

If you have 15 minutes, I'll show you the code. Resume is attached.

Varun Singh
+91 8433808081 | varunsinghh2409@gmail.com

=== REFERENCE EMAIL 3 (Security / Compliance company) ===

Most security platforms aggregate data. Few actually correlate it. I spent the last year building one that does both — and I'm ready to bring that to your team.

I'm Varun Singh, a Full Stack Developer from Mumbai specializing in cybersecurity platforms, MERN stack, and production deployments on AWS.

At Bonum eDesign LLP, I built BlackWall — an enterprise security orchestration platform that aggregates analysis from six engines (MobSF, ClamAV, TruffleHog, OWASP ZAP, and more) into a real-time React/Next.js dashboard. I also engineered a tracker behavioral correlation engine that classifies SDKs as Dormant, Active, or actively Exfiltrating PII — with automated compliance mapping for GDPR, DPDP, and MASVS. That's the kind of depth I bring to every system I build.

I'd love to walk you through the architecture. My resume and GitHub are attached.

Varun Singh
+91 8433808081 | varunsinghh2409@gmail.com

=== WHAT MAKES THESE EMAILS WORK ===
✅ First sentence is a sharp observation about the INDUSTRY PROBLEM — not about the company or the candidate
✅ Introduction is one sentence — name, location, years of experience, specialization
✅ Projects are described with specifics: platform name, live URL if available, exact tech used, measurable outcome
✅ Projects are CHOSEN because they directly mirror the company's domain or stack
✅ CTA is confident and specific ("15-minute call", "show you the code") — not passive ("hope to hear from you")
✅ Signature is clean: name, phone, email — nothing else
✅ Total length: 180–220 words

=== WHAT TO AVOID ===
❌ "I am writing to express my interest in..."
❌ "Please find my resume attached"
❌ "I look forward to hearing from you"
❌ "I am a passionate developer who loves..."
❌ Generic openers like "I came across your job posting"
❌ Listing skills like a bullet resume dump
❌ Mentioning every project — pick the 2 most relevant ONLY
❌ Ending with a question that gives the reader an easy "no"
`;

// ─────────────────────────────────────────────
// SUBJECT LINE REFERENCES
// ─────────────────────────────────────────────
const REFERENCE_SUBJECT_LINES = `
=== GOOD SUBJECT LINES ===
✅ "Full Stack Dev — Shipped Real-Time SaaS at Scale"
✅ "Node.js + Docker — Ready to Build Your Next Platform"
✅ "Built a Radiology SaaS. Can Do the Same for You."
✅ "2 Years Shipping Production Apps — Let's Talk"
✅ "React + Node.js Dev — Your Stack, My Expertise"

=== BAD SUBJECT LINES ===
❌ "Application for Full Stack Developer Role"
❌ "Interested in Joining Your Team"
❌ "Full Stack Developer — Looking for Opportunities"
❌ "Job Application — Varun Singh"
❌ "Following Up on Open Role"
`;

// ─────────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────────
const EMAIL_SYSTEM_PROMPT = `You are an expert cold email copywriter who has written thousands of 
high-converting job application emails. You write with precision, specificity, and confidence. 
You never use generic corporate phrases. Every email you write feels like it was crafted by a 
real human who deeply understands the company they are writing to. You always study the 
reference examples provided and match their tone, structure, and length exactly.`;

const SUBJECT_SYSTEM_PROMPT =
  "You are a direct response copywriter. You write email subject lines that get opened. You never use corporate buzzwords or generic phrases. Every subject line you write is specific, confident, and human.";

// ═══════════════════════════════════════════
// PUBLIC API — Provider-Agnostic
// ═══════════════════════════════════════════

/** Generate personalized email body using the user's selected provider */
export async function generateEmailBody(
  params: GenerateEmailParams,
  apiKey: string,
  modelName: string = DEFAULT_MODEL.id
): Promise<string> {
  const prompt = buildEmailPrompt(params);
  const provider = getProviderForModel(modelName);

  if (provider === "nvidia") {
    return retryWithBackoff(() =>
      nimChatCompletion(apiKey, modelName, [
        { role: "system", content: EMAIL_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ])
    );
  }

  // Default: Gemini
  return retryWithBackoff(() =>
    callGemini(apiKey, modelName, EMAIL_SYSTEM_PROMPT, prompt)
  );
}

/** Generate a compelling subject line using the user's selected provider */
export async function generateSubjectLine(
  company: string,
  role: string,
  stack: string,
  userName: string,
  apiKey: string,
  modelName: string = DEFAULT_MODEL.id
): Promise<string> {
  const prompt = buildSubjectPrompt(company, role, stack, userName);
  const provider = getProviderForModel(modelName);

  let raw: string;

  if (provider === "nvidia") {
    raw = await retryWithBackoff(() =>
      nimChatCompletion(apiKey, modelName, [
        { role: "system", content: SUBJECT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ])
    );
  } else {
    raw = await retryWithBackoff(() =>
      callGemini(apiKey, modelName, SUBJECT_SYSTEM_PROMPT, prompt)
    );
  }

  return raw.replace(/^["']|["']$/g, "");
}

// ═══════════════════════════════════════════
// PROVIDER IMPLEMENTATIONS
// ═══════════════════════════════════════════

/** Call Google Gemini via SDK */
async function callGemini(
  apiKey: string,
  modelName: string,
  systemInstruction: string,
  prompt: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
  });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ═══════════════════════════════════════════
// PROMPT BUILDERS
// ═══════════════════════════════════════════

function buildEmailPrompt(params: GenerateEmailParams): string {
  return `Study these reference cold emails carefully — they show the EXACT tone, structure, length, and style required:

${REFERENCE_EMAILS}

Now write a new cold job application email for ${params.userName} using the candidate background and company details below.

=== CANDIDATE BACKGROUND (from resume) ===
${params.resumeText}

=== TARGET COMPANY ===
- Company: ${params.company}
- Role: ${params.role}
- Description: ${params.description}
- Tech Stack they use: ${params.stack}
- Why this is a good fit: ${params.fitScore}

=== MANDATORY RULES ===
1. First sentence: A sharp 1-sentence observation about the specific PROBLEM this company is solving or the industry challenge they operate in — NOT about the company itself, NOT about the candidate
2. Second paragraph: One sentence introducing the candidate (name, city, experience, specialization most relevant to THIS role)
3. Third paragraph: Pick exactly 2 projects from the candidate's background that DIRECTLY mirror this company's domain or stack — describe each with: project name, what it does, specific tech used, measurable result
4. Final sentence: A confident, specific CTA — suggest a "15-minute call" or "walk you through the code" — never passive
5. Signature: Name, phone, email only — no LinkedIn/GitHub links in the body
6. Length: 180–220 words MAXIMUM — count carefully
7. Tone: Confident, direct, human — like a senior engineer writing to a peer, not a junior begging for a job
8. Start DIRECTLY with the first sentence — no "Dear [name]", no subject line, no preamble

Return ONLY the email body. Nothing before or after it.`;
}

function buildSubjectPrompt(
  company: string,
  role: string,
  stack: string,
  userName: string
): string {
  return `Study these subject line examples:

${REFERENCE_SUBJECT_LINES}

Now write ONE subject line for a cold job application email:
- Applicant: ${userName}
- Company: ${company}
- Role: ${role}
- Their Stack: ${stack}

Rules:
- Maximum 8 words
- Must feel human and specific — not templated
- Must reference either the role, the tech stack, or a capability — NOT the company name
- Do NOT use: "Application for", "Interested in", "Looking for", "Following up", "Job Application"
- Write the kind of subject line that makes a hiring manager open the email out of genuine curiosity

Return ONLY the subject line — no quotes, no explanation, nothing else.`;
}

// ═══════════════════════════════════════════
// RETRY UTILITY
// ═══════════════════════════════════════════

/** Retry with exponential backoff (3 attempts) */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
}
