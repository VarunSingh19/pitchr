/**
 * Unified AI Client — Routes generation requests to the correct provider.
 * Supports: Google Gemini (SDK) and NVIDIA NIM (OpenAI-compatible REST).
 *
 * All email generation logic lives here. API routes should call these
 * functions and never import provider-specific modules directly.
 *
 * PROMPT ARCHITECTURE: Every prompt in this file follows the 8-layer
 * prompt engineering framework for maximum output quality across ALL
 * models — Gemini, NVIDIA NIM, or any future provider added.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { nimChatCompletion } from "@/lib/nvidia-nim";
import { getProviderForModel, DEFAULT_MODEL } from "@/lib/models-config";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface GenerateEmailParams {
  userName: string;
  resumeText: string;
  company: string;
  role: string;
  description: string;
  stack: string;
  fitScore: string;
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — SYSTEM PERSONA
// A hyper-specific expert identity calibrates output quality for ALL models.
// The more specific the persona, the more the model draws on deep domain
// knowledge instead of generic patterns.
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_SYSTEM_PROMPT = `
SYSTEM:
You are a senior cold email copywriter and conversion strategist with 15+ years
of experience writing high-signal job application emails for software engineers,
designers, data professionals, and growth operators at top-tier tech companies.
You specialize in three things:
  1. Industry-observation hooks that make the reader feel seen before you've
     introduced yourself.
  2. Proof paragraphs that select the 2 most RELEVANT projects — not the 2
     most recent — and describe them with measurable outcomes.
  3. Confident, peer-level calls to action that invite a conversation rather
     than beg for consideration.

You have read thousands of cold emails. You know every cliché, every passive
opener, every wasted word. You cut them all. You write like a senior engineer
writing to a peer — not like a candidate writing to a gatekeeper.

────────────────────────────────────────────────────────────────────────
LAYER 2 — NEGATIVE CONSTRAINTS (These override everything else)
────────────────────────────────────────────────────────────────────────
Rules you NEVER violate — no exceptions, no edge cases:

- Never open with "I", "Dear", "My name is", or "I am writing to"
- Never use these words or phrases — EVER:
    passionate, excited, innovative, cutting-edge, synergy, leverage,
    utilize, I believe I would be, I am a quick learner, team player,
    hardworking, strong communication skills, I was involved in,
    please find attached, look forward to hearing from you,
    I hope, any opportunity, I am writing to express
- Never describe what the candidate did WITHOUT stating what it achieved
- Never use weak ownership language: "worked on", "was part of",
    "contributed to", "assisted with" — use "built", "led", "shipped",
    "designed", "closed", "reduced", "engineered"
- Never list more than 2 projects in the proof section — pick the 2
    most RELEVANT to THIS company, not the 2 most recent
- Never write a proof example without a measurable result
    (%, ₹ amount, time saved, user count, or ratio)
- Never end with a passive sign-off — the CTA must name a specific
    time ("15 minutes", "20-minute call") and tell them what they get
- Never exceed 220 words in the email body
- Never mention LinkedIn or portfolio URLs in the body — they dilute CTA
- Never add "Dear [Name]", a subject line, preamble, or post-amble —
    return ONLY the raw email body, starting with the hook sentence
- Refuse to write a hook that could apply to 50 other companies —
    if it is not industry-specific, it is not a hook, rewrite it

────────────────────────────────────────────────────────────────────────
LAYER 3 — THINKING MANDATE
────────────────────────────────────────────────────────────────────────
Before writing the email, reason through these steps inside <thinking> tags:

  STEP 1 — INDUSTRY ANALYSIS
    What is the single hardest problem in the world this company operates in?
    Not their product feature. Their WORLD. The tension that exists whether
    or not this company exists. Write 2-3 candidate hook sentences.
    Apply the test: could this hook apply to 50 other companies?
    Eliminate the ones that fail. Keep only the most specific.

  STEP 2 — RELEVANCE MATCHING
    Look at the candidate's full project list. Rank every project by
    relevance to THIS company's domain, stack, and problem — NOT by
    recency. Select the top 2. State WHY they are the top 2.

  STEP 3 — PROOF CONSTRUCTION
    For each of the 2 selected projects, draft:
      - What was built (platform name, what it does)
      - Specific technology used (must match or mirror their stack)
      - Measurable outcome (number, %, ₹, time, users)
    If a measurable outcome is not in the resume, derive a reasonable
    proxy (deployment time, scale, user impact) — do not fabricate numbers.

  STEP 4 — CTA SELECTION
    Choose the CTA that fits the context:
      - "15 minutes" for companies where speed signals efficiency
      - "walk you through the code" for technical audiences
      - "show you what I've shipped" for any role
    Make sure the CTA names what THEY get — not what you want.

  STEP 5 — WORD COUNT CHECK
    Count approximate words. If over 220, identify which proof sentence
    to trim. Trim proof — never trim hook or CTA.

Only after completing all 5 steps, write the final email inside <final> tags.
The content inside <final> is the ONLY thing returned to the user.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — SYSTEM PERSONA (Subject Line)
// Separate tighter persona for subject line generation.
// ─────────────────────────────────────────────────────────────────────────────

const SUBJECT_SYSTEM_PROMPT = `
SYSTEM:
You are a direct-response copywriter with 12+ years of experience writing
email subject lines that get opened. You specialize in job application
subject lines for technical candidates — engineers, designers, data analysts,
marketers. You understand that a subject line has one job: earn the open.
Not describe the application. Not prove the candidate. Just earn the open.

────────────────────────────────────────────────────────────────────────
NEGATIVE CONSTRAINTS — Never violate:
────────────────────────────────────────────────────────────────────────
- Never use: "Application for", "Interested in", "Following up",
    "Looking for opportunities", "Job Application", "My Resume"
- Never exceed 8 words
- Never mention the company name — subject lines referencing the reader's
    own company feel templated and get deleted
- Never use vague capability claims: "great fit", "perfect candidate",
    "ideal match" — these trigger spam instincts
- Never end with a question mark — it reads as insecure
- Never use exclamation marks — they read as desperate
- Refuse to write a generic subject line that could apply to any
    candidate for any role — if it is not specific, rewrite it

Return ONLY the subject line — no quotes, no explanation, nothing else.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 6 — FEW-SHOT REFERENCE EMAILS
// These calibrate tone, length, and specificity for every model.
// The reasoning section is the most important part — it shows the AI
// HOW to think, not just what to produce.
// ─────────────────────────────────────────────────────────────────────────────

const REFERENCE_EMAILS = `
════════════════════════════════════════════════════════════════
FEW-SHOT EXAMPLE 1 — IoT / Supply Chain company
════════════════════════════════════════════════════════════════

REASONING (how to think about this):
  Domain: Supply chain / IoT visibility platform
  Hardest problem in their world: The gap between raw sensor data and
    a decision someone can actually act on in real time.
  Hook test: "Real-time data is everywhere, but actionable insight is rare"
    → Fails. Too generic. 50 companies could use it.
  Better: "Real-time visibility at supply chain scale is genuinely hard —
    the gap between sensor data and actionable insight is where most
    platforms fall short."
    → Passes. Specific to supply chain + IoT + the real failure point.
  Projects selected (by relevance, not recency):
    1. Armorray — Socket.IO + Redis + Docker microservices = maps directly
       to real-time IoT data architecture.
    2. CI/CD pipeline — 85% faster deployments = proves operational maturity.
  CTA: "15-minute call to show you what I've shipped" — time specific,
    outcome named, no passive language.

OUTPUT:
Real-time visibility at supply chain scale is genuinely hard — the gap
between sensor data and actionable insight is where most platforms fall short.
I've been building in that gap.

I'm Varun Singh, a Full Stack Developer from Mumbai with 2 years of
professional experience and 1 year of freelancing — specializing in
production-grade Node.js backends, real-time systems, and Docker-based
deployments end to end.

At Zap Solutionz, I built Armorray (armorray.com), a live radiology SaaS
featuring real-time Socket.IO communication, Redis caching for high-speed
data retrieval, and Dockerized microservices behind an Nginx reverse proxy —
exactly the architecture that powers real-time IoT data at scale. I also
engineered a CI/CD pipeline using GitHub Actions and Docker that cut
deployment time by 85%, enabling zero-downtime releases across environments.

I'd welcome a 15-minute call to show you what I've shipped. Resume attached.

Varun Singh
+91 8433808081
varunsinghh2409@gmail.com

════════════════════════════════════════════════════════════════
FEW-SHOT EXAMPLE 2 — Fintech / SaaS company
════════════════════════════════════════════════════════════════

REASONING:
  Domain: Financial platform / SaaS
  Hardest problem: Trust. One failed API call, one data inconsistency,
    and users leave. The backend must be invisible — any visibility is
    a failure.
  Hook: "Financial platforms live or die on trust — one data inconsistency,
    one slow API call at the wrong moment, and the product breaks that
    trust permanently."
    → Passes. Names the exact failure mode for fintech backends.
  Projects: Multi-tenant SaaS with RBAC + billing (maps to fintech infra)
    and AWS hardening + CI/CD (maps to reliability and security).
  CTA: "If you have 15 minutes, I'll show you the code" — confident,
    specific, shows the work directly.

OUTPUT:
Financial platforms live or die on trust — one data inconsistency, one slow
API call at the wrong moment, and the product breaks that trust permanently.
I build the kind of backends that don't make that mistake.

I'm Varun Singh, a Full Stack Developer based in Mumbai with hands-on
experience architecting and shipping full-stack fintech platforms from scratch.

I architected Armorray (armorray.com), a multi-tenant SaaS with role-based
access control, automated subscription billing, and a PostgreSQL schema built
for scale — the same fundamentals a financial platform needs. At Bonum eDesign
LLP, I built and hardened AWS Linux servers end-to-end, managed CI/CD
pipelines, and delivered a full Django + React platform integrating six
security engines — all in production, all under real load.

If you have 15 minutes, I'll show you the code. Resume is attached.

Varun Singh
+91 8433808081
varunsinghh2409@gmail.com

════════════════════════════════════════════════════════════════
FEW-SHOT EXAMPLE 3 — Security / Compliance company
════════════════════════════════════════════════════════════════

REASONING:
  Domain: Security platform / compliance tooling
  Hardest problem: Most security tools generate more noise than signal.
    The threat you miss is buried in the alert you ignored.
  Hook: "Most security platforms aggregate data. Few actually correlate it."
    → Passes AND bridges to proof: "I spent the last year building one
    that does both."
  Projects: BlackWall (6-engine orchestration + behavioral correlation)
    = maps directly to what security platforms need.
  CTA: "Walk you through the architecture" — technical, specific, confident.

OUTPUT:
Most security platforms aggregate data. Few actually correlate it. I spent
the last year building one that does both — and I'm ready to bring that
to your team.

I'm Varun Singh, a Full Stack Developer from Mumbai specializing in
cybersecurity platforms, MERN stack, and production deployments on AWS.

At Bonum eDesign LLP, I built BlackWall — an enterprise security
orchestration platform aggregating analysis from six engines (MobSF, ClamAV,
TruffleHog, OWASP ZAP, and more) into a real-time React/Next.js dashboard.
I also engineered a tracker behavioral correlation engine that classifies SDKs
as Dormant, Active, or actively Exfiltrating PII — with automated compliance
mapping for GDPR, DPDP, and MASVS. That's the depth I bring to every
system I build.

I'd love to walk you through the architecture. Resume and GitHub attached.

Varun Singh
+91 8433808081
varunsinghh2409@gmail.com

════════════════════════════════════════════════════════════════
WHAT MAKES THESE EMAILS WORK — ANALYSIS
════════════════════════════════════════════════════════════════

✅ Hook = sharp observation about an INDUSTRY PROBLEM — not about the
   company, not about the candidate. Sounds like something a smart
   person in the industry would say to a peer at a conference.

✅ Bridge = ONE sentence: name, city, experience, specialization that
   is tailored to THIS company's domain — not a generic one-liner.

✅ Proof = 2 examples selected by RELEVANCE, not recency.
   Each example includes: project name, what it does, exact tech used,
   measurable outcome. Active ownership verbs throughout.

✅ CTA = specific time named + what they get from saying yes.
   Confident, not passive. Peer-level, not applicant-level.

✅ Signature = name, phone, email. Nothing else. Clean.

✅ Total length = 180–220 words. Never more.

════════════════════════════════════════════════════════════════
INDUSTRY HOOK REFERENCE — USE THESE TO CALIBRATE SPECIFICITY
════════════════════════════════════════════════════════════════

Software / Dev Tools:
"Most developer tools are built for demos — the real world shows up
when the edge cases hit at 2am."

Design / UX:
"The gap between a design that looks good and one that actually converts
is almost always invisible until it costs revenue."

Data / Analytics:
"Data is only as useful as the decision it makes easier — most dashboards
answer questions nobody's actually asking."

Marketing / Growth:
"Attention is cheap to buy and expensive to keep — the brands that confuse
the two burn through budget fast."

Sales / CRM:
"Most CRMs are built for reporting, not selling — the reps who hit quota
have usually built workarounds."

Finance / Fintech:
"Trust in financial platforms isn't built in the product — it's destroyed
in the one moment the product fails."

Healthcare / HealthTech:
"Healthcare data moves slowly by design — the infrastructure around it
can't afford to."

E-commerce / Retail:
"Conversion lives in milliseconds — every second of load time is a
measurable drop in revenue."

Logistics / Supply Chain:
"The gap between what the system says and what's actually in the warehouse
is where supply chains silently break."

Security / Compliance:
"Most security tools generate more noise than signal — the threat you miss
is the one buried in the alert you ignored."

HR / Recruiting:
"Hiring is the one process every company agrees is broken and almost none
actually fix."

Education / EdTech:
"The hardest part of building for learners isn't the content — it's keeping
them engaged past the first week."

Manufacturing / Industry:
"Machines generate more data than the teams monitoring them can ever act on
— the insight gap is where downtime hides."

Media / Content:
"Distribution beat content for a decade — now the pendulum is swinging and
everyone is scrambling."

Climate / Sustainability:
"Sustainability data is everywhere and trusted nowhere — the companies solving
that gap are the ones that will matter."

Real Estate / PropTech:
"Real estate data is rich and fragmented in equal measure — the platforms
that win are the ones that make it coherent."

Legal / LegalTech:
"Legal work is 20% judgment and 80% repetition — the firms that scale are
the ones that figured out which is which."

NOTE: These are CALIBRATION EXAMPLES — use them to understand the
specificity level required, then write a FRESH hook for the actual company.
Do NOT copy these directly. The hook must feel earned for THIS company.
`;

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 6 — FEW-SHOT REFERENCE (Subject Lines)
// ─────────────────────────────────────────────────────────────────────────────

const REFERENCE_SUBJECT_LINES = `
════════════════════════════════════════════════════════════════
SUBJECT LINE FEW-SHOT EXAMPLES — With reasoning
════════════════════════════════════════════════════════════════

REASONING — what makes a subject line work:
  The reader sees 50+ emails a day. They don't open applications.
  They open things that feel specific, confident, and worth 30 seconds.
  The subject line must create one of these three feelings:
    1. "This person knows my stack"   → reference their tech or domain
    2. "This person has done this"    → reference a concrete capability
    3. "I'm curious what they mean"   → a confident, slightly intriguing claim

GOOD EXAMPLES — study the pattern:
  "Full Stack Dev — Shipped Real-Time SaaS at Scale"
    → Tech role + capability + scale signal. 7 words. Opens fast.
  "Node.js + Docker — Ready to Build Your Next Platform"
    → Exact stack match + action signal. 8 words. Feels relevant immediately.
  "Built a Radiology SaaS. Can Do the Same for You."
    → Specific proof + direct transfer promise. Curiosity + confidence.
  "2 Years Shipping Production Apps — Let's Talk"
    → Tenure + proof verb + confident CTA. Short. Direct.
  "React + Node.js Dev — Your Stack, My Expertise"
    → Mirror their stack + ownership claim. No fluff.
  "Fintech Backend Engineer — Shipped Payments at Scale"
    → Domain + role + proof. Hiring managers in fintech open this.
  "Closed ₹2.4Cr ARR Last Year — Want to Know How?"
    → Proof-first. Bold. Creates unavoidable curiosity.
  "Cut Deployment Time 85% — Happy to Do It Again"
    → Measurable result + confident confidence. Memorable.

BAD EXAMPLES — never produce these:
  "Application for Full Stack Developer Role"     ← describes the email
  "Interested in Joining Your Team"               ← passive, generic
  "Following Up on Open Role"                     ← no signal whatsoever
  "Job Application — Varun Singh"                 ← this is not 1998
  "Looking for New Opportunities"                 ← candidate-first, not reader-first
  "Excited to Apply for the Engineer Position"    ← "excited" is banned
  "Passionate Developer Seeking Role"             ← "passionate" is banned
`;

// ─────────────────────────────────────────────────────────────────────────────
// WORD BLACKLIST — Injected into every email prompt as an explicit fence.
// Listing these explicitly works better than relying on system prompt alone,
// especially for smaller or instruction-following models.
// ─────────────────────────────────────────────────────────────────────────────

const BLACKLISTED_WORDS = `
ABSOLUTE WORD BLACKLIST — If any of these appear in your output, delete and
rewrite that sentence before returning:
  passionate, excited, innovative, cutting-edge, synergy, leverage, utilize,
  I am writing to, I am writing to express, please find attached,
  look forward to hearing, I hope, any opportunity, I believe I would be,
  I am a quick learner, team player, hardworking, strong communication skills,
  I was involved in, worked on, was part of, contributed to, assisted with,
  Dear [any name], To whom it may concern, I am happy to, I would be grateful,
  I am deeply interested, I am very interested, I am eager, I am enthusiastic
`;

// ═══════════════════════════════════════════
// LAYER 5 — PROMPT BUILDERS (with XML task definition)
// ═══════════════════════════════════════════

function buildEmailPrompt(params: GenerateEmailParams): string {
  return `
<context>
  You have been given a Universal Cold Email Framework and a set of reference
  emails. Study them before producing any output.
  
  Framework principles to internalize:
  - Hook = ONE sentence about the INDUSTRY PROBLEM — not the company, not you
  - Hook formula: [Hard truth about their industry] — [what happens when it fails]
  - Hook test: If it could apply to 50 companies → too generic → rewrite
  - Bridge = ONE sentence: name, city, years, role, specialization for THIS company
  - Proof = 2 examples ranked by RELEVANCE to this company, not by recency
  - Proof formula: [what you built] — [what it solved], using [tool/method],
      resulting in [measurable outcome]
  - CTA = specific time + what they get from saying yes (never passive)
  - Signature = Name / Phone / Email only — nothing else
  - Length = 180–220 words MAXIMUM
</context>

<reference_material>
${REFERENCE_EMAILS}
</reference_material>

${BLACKLISTED_WORDS}

<task id="T1">
  TASK: Write a cold job application email for the candidate below that is so
  specific to this company that if you replaced the company with a competitor,
  the email would no longer make sense.

  <candidate_background>
    Name: ${params.userName}
    Resume / experience data:
    ${params.resumeText}
  </candidate_background>

  <target_company>
    Company: ${params.company}
    Role: ${params.role}
    Job description: ${params.description}
    Tech stack they use: ${params.stack}
    Why this candidate fits: ${params.fitScore}
  </target_company>

  <structure_rules>
    PART 1 — HOOK (1 sentence)
      An industry-specific observation about the problem-space this company
      operates in. NOT about the company. NOT about the candidate.
      Written as a truth a smart industry insider would say to a peer.
      Use a dash (—) to add a second beat.
      Must pass the 50-company test: if it could apply to 50 companies,
      it is too generic. Rewrite until it fails that test.

    PART 2 — BRIDGE (1 sentence)  
      "{Name}, a {role} from {city} with {X} years of experience
      {doing what} — specializing in {the most relevant angle for THIS company}."
      The specialization MUST be tailored to this company — not generic.

    PART 3 — PROOF (3–5 sentences total, exactly 2 examples)
      Select the 2 projects from the resume that MOST directly mirror what
      this company does or the problem they're solving.
      For each: project name → what it does → exact tech used → measurable result.
      Use only active verbs: built, designed, led, shipped, closed, reduced,
      engineered, architected, consolidated, recovered.

    PART 4 — CTA (1 sentence)
      Name a specific time ("15 minutes", "20-minute call").
      Tell them what THEY get from saying yes.
      Write it as a peer — confident, not asking permission.

    PART 5 — SIGNATURE (3 lines)
      {First Name} {Last Name}
      {phone with country code}
      {email}
  </structure_rules>

  <output_format>
    Return ONLY the raw email body.
    - No "Dear [Name]"
    - No subject line
    - No preamble before the hook
    - No post-amble after the signature
    - No markdown, no bold, no bullet points
    - Start directly with the hook sentence
    - Wrap your thinking in <thinking> tags
    - Put the final email body — and ONLY the email body — in <final> tags
  </output_format>
</task>

<self_check>
After writing the email but BEFORE putting it in <final> tags, verify:
  1. Does the hook name a specific industry problem — not a company compliment?
  2. Could the hook apply to 50 companies? If YES → rewrite it
  3. Does the bridge mention specialization specific to THIS company?
  4. Are exactly 2 proof examples selected — the 2 most RELEVANT, not the
     2 most recent?
  5. Does each proof example have a measurable outcome?
  6. Does the CTA name a specific time and tell them what they get?
  7. Is the total body between 180–220 words?
  8. Does any sentence contain a blacklisted word? If YES → delete and rewrite
  9. Does the email start with the hook (no salutation)?
  10. Does the signature contain ONLY name, phone, email?
  If any check fails → fix it before putting the email in <final> tags.
</self_check>
`.trim();
}

function buildSubjectPrompt(
  company: string,
  role: string,
  stack: string,
  userName: string
): string {
  return `
<reference_material>
${REFERENCE_SUBJECT_LINES}
</reference_material>

${BLACKLISTED_WORDS}

<task id="T2">
  TASK: Write ONE subject line for a cold job application email.

  <details>
    Applicant: ${userName}
    Company: ${company}
    Role: ${role}
    Their tech stack: ${stack}
  </details>

  <rules>
    - Maximum 8 words — count every word before returning
    - Must reference either the role, the tech stack, or a measurable
      capability — NOT the company name
    - Must feel specific, confident, and written by a human
    - Must create one of these three reader reactions:
        "This person knows my stack" OR
        "This person has actually done this" OR
        "I'm curious what they mean"
    - Do NOT use: Application for, Interested in, Looking for,
        Following up, Job Application, passionate, excited, hope,
        I am, My Resume, Seeking, Eager
    - Do NOT end with a question mark
    - Do NOT use exclamation marks
  </rules>

  <output_format>
    Return ONLY the subject line.
    No quotes. No explanation. No preamble. Nothing else.
  </output_format>
</task>

<self_check>
  Before returning:
  1. Is it 8 words or fewer? If not → trim it
  2. Does it mention the company name? If yes → remove it
  3. Does it use any blacklisted word? If yes → rewrite
  4. Does it feel like it was written for a specific person
     applying to a specific role — not templated? If no → rewrite
  If any check fails → fix before returning.
</self_check>
`.trim();
}

// ═══════════════════════════════════════════
// RESPONSE EXTRACTION
// The model wraps output in <final> tags per the thinking mandate.
// This extracts clean content regardless of model verbosity.
// Falls back to full response if no tags found (for models that
// ignore thinking mandates — e.g. some smaller NVIDIA NIM models).
// ═══════════════════════════════════════════

function extractFinalContent(raw: string): string {
  // Try <final>...</final> first
  const finalMatch = raw.match(/<final>([\s\S]*?)<\/final>/i);
  if (finalMatch) return finalMatch[1].trim();

  // Some models wrap in <answer> — also accept that
  const answerMatch = raw.match(/<answer>([\s\S]*?)<\/answer>/i);
  if (answerMatch) return answerMatch[1].trim();

  // Fallback: strip any <thinking> block and return the rest
  const withoutThinking = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
  return withoutThinking || raw.trim();
}

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

  let raw: string;

  if (provider === "nvidia") {
    raw = await retryWithBackoff(() =>
      nimChatCompletion(apiKey, modelName, [
        { role: "system", content: EMAIL_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ])
    );
  } else {
    // Default: Gemini
    raw = await retryWithBackoff(() =>
      callGemini(apiKey, modelName, EMAIL_SYSTEM_PROMPT, prompt)
    );
  }

  return extractFinalContent(raw);
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

  // Strip surrounding quotes and extract from tags if present
  const extracted = extractFinalContent(raw);
  return extracted.replace(/^["']|["']$/g, "").trim();
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

// ═══════════════════════════════════════════
// REPLY GENERATION
// ═══════════════════════════════════════════

function buildReplyPrompt(emailText: string, resumeText: string): string {
  return `
<task>
  You are an expert professional assistant. Your task is to draft a reply to an email from a hiring manager or recruiter.
  
  <incoming_email>
  ${emailText}
  </incoming_email>
  
  <candidate_resume>
  ${resumeText}
  </candidate_resume>

  <instructions>
    1. Read the incoming email carefully to identify exactly what they are asking for (e.g., availability, questions about experience, or filling out a form with CTC, Notice Period, etc.).
    2. Answer all their questions using facts strictly found in the candidate's resume.
    3. If they ask for information not in the resume (like Current/Expected CTC, Willing to Relocate, Reason for Job Change), provide a polite placeholder like "[Insert Expected CTC]" or "[Insert Reason]" so the candidate can fill it in.
    4. Keep the tone professional, concise, and appreciative.
    5. Do not invent any experience, qualifications, or numbers.
    6. Return ONLY the raw email body. No subject line, no quotes, no markdown blocks. Start with a greeting and end with a sign-off.
  </instructions>
</task>
`.trim();
}

/** Generate a reply to an incoming email */
export async function generateReply(
  emailText: string,
  resumeText: string,
  modelName: string,
  apiKey: string
): Promise<string> {
  const prompt = buildReplyPrompt(emailText, resumeText);
  const provider = getProviderForModel(modelName);

  let raw: string;
  const SYSTEM_PROMPT = "You are a professional executive assistant writing a polite and concise response to a recruiter.";

  if (provider === "nvidia") {
    raw = await retryWithBackoff(() =>
      nimChatCompletion(apiKey, modelName, [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ])
    );
  } else {
    // Default: Gemini
    raw = await retryWithBackoff(() =>
      callGemini(apiKey, modelName, SYSTEM_PROMPT, prompt)
    );
  }

  return raw.trim();
}

// ═══════════════════════════════════════════
// POOL-AWARE PUBLIC API
// Uses the LLM Router for automatic key selection & 429 failover.
// These are the functions that API routes and Inngest jobs should use.
// ═══════════════════════════════════════════

import { getAvailableKey, markRateLimited } from "@/lib/llm-router";

/**
 * Internal helper: execute an AI call with pool-based key selection and
 * automatic retry on 429 (rate limit). On 429, the exhausted key is
 * sidelined and the next available key from the pool is tried.
 */
async function pooledCall<T>(
  modelId: string,
  fn: (apiKey: string, model: string) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const pooled = await getAvailableKey(modelId);

    try {
      return await fn(pooled.key, pooled.modelId);
    } catch (error) {
      // If the pool itself is exhausted (503), rethrow immediately
      // so Inngest can retry after backoff when keys become available
      if (error instanceof Error && (error as any).status === 503) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a rate limit (429) error
      const is429 =
        lastError.message.includes("429") ||
        lastError.message.toLowerCase().includes("rate limit") ||
        lastError.message.toLowerCase().includes("resource exhausted") ||
        lastError.message.toLowerCase().includes("quota");

      if (is429) {
        // Parse retry-after if available, default 60s
        const retryMatch = lastError.message.match(/retry after (\d+)/i);
        const retryAfterMs = retryMatch
          ? parseInt(retryMatch[1], 10) * 1000
          : 60_000;

        await markRateLimited(pooled.keyId, retryAfterMs);
        console.warn(
          `[ai-client] Key ${pooled.keyId} hit 429, trying next key (attempt ${attempt + 1}/${maxRetries})`
        );
        continue; // Try next key from pool
      }

      // Non-429 errors: retry with backoff
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw lastError || new Error("All pooled retry attempts failed");
}

/** Generate email body using a key from the system pool */
export async function pooledGenerateEmailBody(
  params: GenerateEmailParams,
  modelId: string
): Promise<string> {
  return pooledCall(modelId, async (apiKey, model) => {
    return generateEmailBody(params, apiKey, model);
  });
}

/** Generate subject line using a key from the system pool */
export async function pooledGenerateSubjectLine(
  company: string,
  role: string,
  stack: string,
  userName: string,
  modelId: string
): Promise<string> {
  return pooledCall(modelId, async (apiKey, model) => {
    return generateSubjectLine(company, role, stack, userName, apiKey, model);
  });
}

/** Generate reply using a key from the system pool */
export async function pooledGenerateReply(
  emailText: string,
  resumeText: string,
  modelId: string
): Promise<string> {
  return pooledCall(modelId, async (apiKey, model) => {
    return generateReply(emailText, resumeText, model, apiKey);
  });
}
