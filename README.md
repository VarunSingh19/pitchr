<div align="center">
  <h1>🚀 Pitchr</h1>
  <p><strong>The Intelligent B2B Cold Email Automation Platform</strong></p>
  <p>Pitchr is a production-ready, highly resilient cold email automation platform. Built for scale and reliability, Pitchr orchestrates complex LLM chains, asynchronous task processing, direct SMTP dispatch, and intelligent IMAP inbox parsing to automate the entire lifecycle of outbound outreach.</p>
</div>

---

## 📑 Table of Contents

1. [Philosophy & Design Principles](#philosophy--design-principles)
2. [Comprehensive Feature Matrix](#comprehensive-feature-matrix)
3. [System Architecture Deep Dive](#system-architecture-deep-dive)
   - [LLM Routing & Redundancy](#llm-routing--redundancy)
   - [Asynchronous Queue Management](#asynchronous-queue-management)
   - [Delivery & Bounce Pipeline](#delivery--bounce-pipeline)
   - [Smart Inbox Strategy](#smart-inbox-strategy)
4. [Technology Stack](#technology-stack)
5. [Project Structure Directory](#project-structure-directory)
6. [Environment Configuration Guide](#environment-configuration-guide)
7. [Local Development Setup](#local-development-setup)
8. [Deployment Playbook](#deployment-playbook)
9. [Security Posture](#security-posture)
10. [Troubleshooting & Debugging](#troubleshooting--debugging)

---

## 🧠 Philosophy & Design Principles

Pitchr was engineered to solve three major pain points in standard cold email software:
1. **Generic Output:** Static templates fail. Pitchr uses LLMs to compare a candidate's specific resume text against a target company's job description, generating highly relevant "fit" narratives.
2. **LLM Unreliability:** API rate limits, 500 errors, and quota exhaustion break automated pipelines. Pitchr treats AI generation as an inherently volatile operation and builds a failover safety net.
3. **Data Integrity:** False positives in delivery tracking ruin campaign metrics. Pitchr connects directly to the user's IMAP server to parse raw `Mailer-Daemon` and Delivery Status Notifications (DSN), ensuring bounce metrics are perfectly accurate.

---

## ✨ Comprehensive Feature Matrix

### 1. Intelligent Generation Engine
- **Resume Parsing Engine:** Extracts structured text from base64 PDF uploads using `pdf-parse`.
- **Multi-LLM Strategy:** Distributes generation tasks across Gemini 1.5 Pro, Claude 3 Opus/Sonnet, OpenAI GPT-4o, and DeepSeek.
- **Contextual Injectors:** Automatically pulls user name, target company, role, custom instructions, and parsed resume into a highly optimized zero-shot prompt.

### 2. Campaign Orchestration
- **Duplicate Prevention:** Before generation, leads are cross-referenced via an `$in` query against the `EmailLog` collection. Users are warned visually in the UI and given a 1-click purge option.
- **Server-Sent Events (SSE):** Manual batch sending streams progress to the client via `text/event-stream`, updating row-level UI status in real-time.
- **Background Auto-Send:** Users can toggle "Auto Send" to offload dispatching to the background. Once generation finishes, Inngest sequentially sends emails with strict 4-second SMTP rate-limiting delays.

### 3. Deliverability & Inbox Management
- **SMTP Native:** No third-party email APIs (SendGrid, Mailgun) which often end up in "Promotions" tabs. Pitchr sends natively through the user's Gmail via App Passwords.
- **Post-Send Verification:** A delayed job runs 5 minutes after a campaign finishes. It searches the user's inbox for `Subject: Delivery Status Notification` and `From: mailer-daemon`, parsing the `In-Reply-To` headers to definitively identify hard bounces.
- **Smart Inbox:** A unified view of all replies to Pitchr-originated threads. Users can select an incoming email and use the "AI Reply" feature, which feeds the entire thread context back to the LLM to draft a response.

---

## 🏗️ System Architecture Deep Dive

Pitchr's architecture decouples heavy processing from the Next.js request lifecycle, ensuring the UI remains perfectly fluid even when processing thousands of LLM requests.

### LLM Routing & Redundancy

The AI generation pipeline must never drop an email due to a simple 429 Rate Limit. 

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as /api/campaign/start
    participant Queue as Inngest Queue
    participant Router as LLM Router (lib/llm-router.ts)
    participant Providers as AI Providers
    participant DB as MongoDB

    Client->>API: HTTP POST {leads[], resumeText}
    API->>Queue: inngest.send([{ name: "campaign/generate.email", data: {...} }])
    API-->>Client: HTTP 200 OK (Queued)
    
    loop For each event in Queue
        Queue->>Router: Execute `generateSingleEmail`
        Router->>Router: Determine preferred model (e.g., Gemini)
        
        Router->>Providers: Request Generation
        alt 200 OK
            Providers-->>Router: Return Payload
        else 429 Rate Limit / 500 Error
            Providers-->>Router: Throw Error
            Router->>Router: Catch error, select fallback model (e.g., Claude)
            Router->>Providers: Retry Request with Fallback
            Providers-->>Router: Return Payload
        end
        
        Queue->>DB: Update EmailLog (Status: GENERATED, Body: Payload)
    end
```

### Asynchronous Queue Management

Pitchr uses Inngest to manage stateful workflows. Instead of relying on long-polling Next.js API routes (which timeout on Vercel after 10-60 seconds), Inngest steps execute independently.

```mermaid
sequenceDiagram
    autonumber
    participant Queue as Inngest Orchestrator
    participant Gen as generateSingleEmail Step
    participant Send as autoSendCampaign Step
    participant SMTP as Nodemailer
    participant DB as MongoDB

    Gen->>DB: Save Generated Email
    Gen->>DB: Count total generated vs campaign.totalLeads
    
    alt is Campaign Complete?
        Gen->>DB: Yes: Check `autoSend` flag
        alt autoSend == true
            Gen->>Queue: Emit "campaign/auto-send"
        else autoSend == false
            Gen->>DB: Update Campaign Status -> READY
        end
    end
    
    Queue->>Send: Triggered by "campaign/auto-send"
    Send->>DB: Fetch user Gmail credentials
    
    loop Sequential Send
        Send->>SMTP: transporter.sendMail(...)
        SMTP-->>Send: Return Message-ID
        Send->>DB: $inc sentCount, Update EmailLog -> SENT
        Send->>Send: await setTimeout(4000) (Rate Limit Guard)
    end
    
    Send->>Queue: Emit "campaign/verify.delivery"
    Send->>Queue: Emit "campaign/completed"
```

### Delivery & Bounce Pipeline

Standard tracking pixels do not detect hard bounces. Pitchr physically parses the inbox to guarantee accuracy.

```mermaid
sequenceDiagram
    autonumber
    participant Job as verifyDelivery Job
    participant IMAP as ImapFlow (imap.gmail.com)
    participant DB as MongoDB

    Note over Job: Job starts exactly 5 mins after campaign finishes
    Job->>Job: Sleep via `step.sleep("5m")`
    Job->>DB: Load User App Password
    Job->>IMAP: Connect & authenticate (TLS 993)
    
    Job->>IMAP: client.search({ since: 24h, or: [{from: mailer-daemon}, {subject: "Delivery Status Notification"}] })
    IMAP-->>Job: Return matching UIDs
    
    loop For each bounced email
        Job->>IMAP: Fetch Headers
        IMAP-->>Job: Return parsed headers (In-Reply-To, References)
        Job->>DB: Find EmailLog matching In-Reply-To == EmailLog.messageId
        alt Match Found
            Job->>DB: Update EmailLog status to BOUNCED
            Job->>DB: Campaign update: $inc { sentCount: -1, bouncedCount: 1 }
        end
    end
    
    Job->>IMAP: client.logout()
```

### Smart Inbox Strategy

The Inbox view merges outbound `EmailLog` records with inbound IMAP threads.

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant InboxAPI as /api/inbox
    participant IMAP as ImapFlow
    participant DB as MongoDB

    Client->>InboxAPI: HTTP GET
    InboxAPI->>DB: Fetch user credentials
    InboxAPI->>IMAP: Connect & search INBOX (Unseen, or Last 7 days)
    
    loop Fetch Thread Details
        IMAP->>IMAP: client.fetchOne(uid, { source: true })
        IMAP->>IMAP: simpleParser(source) -> Extract Message-ID, In-Reply-To
    end
    
    IMAP-->>InboxAPI: Parsed Emails Array
    
    InboxAPI->>DB: Find EmailLog where messageId == In-Reply-To
    DB-->>InboxAPI: Associated Company/Role data
    
    InboxAPI->>InboxAPI: Merge IMAP data with DB context
    InboxAPI-->>Client: Render Smart Inbox UI
```

---

## 🛠️ Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Framework** | Next.js 14 App Router | Server Components reduce client bundle size; integrated API routes simplify deployment. |
| **Language** | TypeScript (Strict) | Enforces interface contracts between DB documents, API payloads, and UI props. |
| **Database** | MongoDB & Mongoose | Document-oriented schema is ideal for flexible JSON lead structures and dynamic email logs. |
| **Styling** | Tailwind CSS & CSS Modules | Utility-first approach for rapid UI iteration; custom CSS vars for theming. |
| **Background Jobs** | Inngest | Step-based orchestration prevents timeouts and provides automatic retries for flaky AI APIs. |
| **Authentication** | NextAuth.js | Secure session management with JWT strategies. |
| **Email Protcols** | `nodemailer` & `imapflow` | Low-level control over SMTP dispatch and raw IMAP header parsing. |
| **AI SDKs** | `@google/genai`, `@anthropic-ai/sdk`, `openai` | Direct integration with provider APIs for fine-grained prompt control and structured output handling. |

---

## 📁 Project Structure Directory

A deep look into the structural organization of the Pitchr repository:

```
pitchr/
├── app/                      # Next.js App Router root
│   ├── admin/                # Admin dashboard (Key management)
│   ├── api/                  # Backend REST API Routes
│   │   ├── auth/             # NextAuth endpoints
│   │   ├── campaign/         # Campaign orchestration (start, create, status)
│   │   ├── inbox/            # IMAP sync and read routes
│   │   ├── inngest/          # Webhook for background job engine
│   │   ├── leads/            # Duplicate detection utilities
│   │   ├── models/           # LLM Router healthchecks
│   │   ├── parse-resume/     # PDF extraction utility
│   │   ├── send-batch/       # SSE Streaming manual dispatcher
│   │   └── user/             # Profile, settings, and credential management
│   ├── dashboard/            # Main User Application
│   │   ├── campaign/new/     # Multi-step campaign creation wizard
│   │   ├── history/          # Historical campaign metrics and logs
│   │   ├── inbox/            # Smart thread view and AI reply UI
│   │   └── settings/         # Gmail configuration and preferences
│   ├── login/                # Authentication entry point
│   ├── layout.tsx            # Root application shell and context providers
│   └── page.tsx              # Public marketing/landing page
├── components/               # Reusable React UI Components
│   ├── company-table.tsx     # Data grid for lead management
│   ├── dashboard-shell.tsx   # Sidebar navigation and layout wrapper
│   ├── email-preview-table.tsx # Inline editor for LLM-generated drafts
│   ├── file-upload.tsx       # Drag-and-drop zone for PDF resumes
│   ├── generation-progress.tsx # Real-time AI generation polling UI
│   └── send-progress.tsx     # SSE real-time dispatch progress UI
├── docs/                     # Detailed architectural documentation
│   └── api.md                # Exhaustive API reference and schemas
├── inngest/                  # Background Job Definitions
│   ├── client.ts             # Inngest SDK initialization
│   └── functions.ts          # Core job logic (generate, send, verify)
├── lib/                      # Core Utility Functions
│   ├── ai-client.ts          # Multi-LLM provider wrappers
│   ├── campaign-draft.ts     # LocalStorage state persistence
│   ├── db.ts                 # MongoDB connection pooling
│   ├── encryption.ts         # AES-256 credential enc/dec utilities
│   ├── llm-router.ts         # Redundancy & failover logic engine
│   ├── mailer.ts             # Nodemailer singleton configuration
│   └── types.ts              # Global TypeScript interfaces
├── models/                   # Mongoose Database Schemas
│   ├── Campaign.ts           # Campaign metadata and aggregated metrics
│   ├── EmailLog.ts           # Individual email records (Status, Body, IDs)
│   └── User.ts               # User profiles, encrypted keys, and settings
├── scripts/                  # DevOps & Setup utilities
│   ├── seed-admin.js         # Script to bootstrap initial admin user
│   └── migrate-*.js          # Database migration scripts
├── .env.example              # Template for required environment variables
├── next.config.mjs           # Next.js bundler and build configuration
├── tailwind.config.ts        # Tailwind theme and plugin definitions
└── tsconfig.json             # TypeScript compiler settings
```

---

## ⚙️ Environment Configuration Guide

Pitchr relies on a strictly configured environment to operate securely. Below is an exhaustive breakdown of required keys in `.env.local`.

### Database & Core
- `MONGODB_URI`: The connection string to your MongoDB cluster. Ensure network access is configured to allow connections from your deployment IPs.
  - *Example:* `mongodb+srv://admin:pass@cluster0.mongodb.net/pitchr?retryWrites=true&w=majority`
- `NEXTAUTH_SECRET`: A cryptographic salt used by NextAuth to sign JWT tokens. Must be a minimum of 32 random characters.
  - *Generation command:* `openssl rand -base64 32`
- `NEXTAUTH_URL`: The canonical URL of the application. Required for NextAuth redirects.
  - *Local:* `http://localhost:3000`
  - *Prod:* `https://pitchr.yourdomain.com`

### Cryptography (CRITICAL)
- `ENCRYPTION_KEY`: Used by `lib/encryption.ts` to execute AES-256-CBC encryption on sensitive data (Gmail App Passwords, Custom LLM Keys).
  - **Constraint:** Must be **exactly** 32 characters long.
  - *Example:* `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
  - **Warning:** Changing this key after database initialization will render all stored credentials unreadable.

### System Notifications (SMTP)
- `GMAIL_USER`: The system email address used to dispatch platform notifications (e.g., Campaign Completion Summaries).
- `GMAIL_USER_PASSWORD`: The 16-character App Password generated from the Google Account security settings.

### Background Orchestration
- `INNGEST_EVENT_KEY`: Routes events to the correct Inngest app. Use `local` for development.
- `INNGEST_SIGNING_KEY`: Used to verify webhook signatures. Use `local` for development.

---

## 💻 Local Development Setup

Follow these steps to bootstrap the platform on a local machine for development and testing.

### 1. Repository Cloning
```bash
git clone https://github.com/your-org/pitchr.git
cd pitchr
npm install
```

### 2. Configure Environment
Copy the example template and populate the variables as described in the Configuration Guide.
```bash
cp .env.example .env.local
```

### 3. Bootstrap the Database
Initialize the database with an Admin user account. This script hashes the password and creates the user document.
```bash
node scripts/seed-admin.js
```
*Follow the CLI prompts to set the email and password.*

### 4. Start the Application Matrix
Pitchr requires two distinct processes running concurrently in local development.

**Process A: The Next.js API & UI**
```bash
npm run dev
```

**Process B: The Inngest Dev Server**
The dev server intercepts background events and provides a local dashboard to monitor step executions.
```bash
npx inngest-cli@latest dev
```

### 5. Access the Platform
- **Pitchr UI:** [http://localhost:3000](http://localhost:3000)
- **Inngest Dashboard:** [http://localhost:8288](http://localhost:8288)

---

## 🚀 Deployment Playbook

Pitchr is architected as a serverless Next.js application, making it perfectly suited for Vercel.

### Step 1: Database Provisioning
1. Provision a MongoDB cluster (e.g., MongoDB Atlas).
2. Create a database user with `readWriteAnyDatabase` privileges.
3. Whitelist Vercel's IP addresses (or allow `0.0.0.0/0` if relying solely on authentication credentials).
4. Extract the Connection String.

### Step 2: Inngest Cloud Setup
1. Create an account on [Inngest Cloud](https://app.inngest.com/).
2. Create a new environment (e.g., Production).
3. Extract the production `Event Key` and `Signing Key`.

### Step 3: Vercel Deployment
1. Import the Pitchr Git repository into Vercel.
2. Navigate to the project **Settings > Environment Variables**.
3. Input ALL variables defined in `.env.local` (ensure `ENCRYPTION_KEY` is exactly 32 chars).
4. Set `NEXTAUTH_URL` to your Vercel production domain.
5. Trigger the deployment.

### Step 4: Webhook Synchronization
1. Once Vercel deployment is complete, navigate to your live URL path: `https://your-domain.com/api/inngest`
2. In the Inngest Cloud dashboard, sync your application using that exact URL. This registers your production functions.

---

## 🛡️ Security Posture

Pitchr handles highly sensitive data (emails, API keys, application passwords). The architecture employs multiple defense-in-depth strategies:

- **Symmetric Encryption:** The `lib/encryption.ts` module uses Node's native `crypto` library to perform AES-256-CBC encryption. The initialization vector (IV) is uniquely generated for every single database write and concatenated to the ciphertext.
- **Middleware Guards:** `NextAuth` middleware intercepts all requests to `/dashboard/*` and `/admin/*`, redirecting unauthenticated traffic instantly before any React component mounts or API logic executes.
- **Role-Based Access Control (RBAC):** Fallback API keys managed in the `/admin` panel are protected by strict session role checks (`session.user.role === 'ADMIN'`).
- **SMTP Rate Throttling:** Google Workspace implements strict send limits (typically 500-2000 per day) and connection frequency limits. Pitchr's batch dispatcher explicitly implements `await new Promise((resolve) => setTimeout(resolve, 4000));` to guarantee a maximum velocity of 15 emails per minute, preventing algorithmic spam blocks.

---

## 🐛 Troubleshooting & Debugging

### Issue: "Gmail credentials invalid" during sending
**Cause:** The user's Google App Password was revoked, or the account is locked.
**Resolution:** Navigate to Google Account Security, revoke the old app password, generate a new 16-character password, and update it in Pitchr -> Settings.

### Issue: "Failed to queue delivery verification"
**Cause:** Inngest webhook is unreachable from the Next.js process.
**Resolution:** Check that `INNGEST_EVENT_KEY` is correct. If running locally, ensure the `npx inngest-cli dev` process is running in a secondary terminal.

### Issue: Emails are stuck in "GENERATING" status
**Cause:** The LLM Router exhausted all available API keys across all providers.
**Resolution:** Check the Inngest Dashboard (`localhost:8288` or Cloud). View the execution logs for `generateSingleEmail` to see the exact API errors (usually 401 Unauthorized or 429 Rate Limit) thrown by the AI providers. Add valid keys via the Pitchr Admin or User settings panel.

---
*Architected for scale. Engineered for deliverability. Built by engineers, for engineers.*
