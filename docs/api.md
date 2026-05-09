# Pitchr API Reference & Backend Documentation

Welcome to the definitive backend documentation for the Pitchr Cold Email Automation Platform. This document provides an exhaustive, route-by-route breakdown of the Next.js API ecosystem, Mongoose schemas, and Inngest background orchestration logic.

---

## 📑 Table of Contents

1. [Architectural Overview & Standards](#1-architectural-overview--standards)
2. [Database Schemas (Mongoose)](#2-database-schemas-mongoose)
3. [Authentication & User Management APIs](#3-authentication--user-management-apis)
4. [Campaign Lifecycle APIs](#4-campaign-lifecycle-apis)
5. [SMTP Dispatch & IMAP Inbox APIs](#5-smtp-dispatch--imap-inbox-apis)
6. [Administration & Routing APIs](#6-administration--routing-apis)
7. [Inngest Background Event Payloads](#7-inngest-background-event-payloads)

---

## 1. Architectural Overview & Standards

### Core Paradigms
- **App Router:** All APIs reside in `app/api/[path]/route.ts` and export standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`).
- **Authentication Wrapper:** Almost every route executes `const session = await auth();` at the beginning. If the session is missing, a `401 Unauthorized` response is immediately returned.
- **Stateless Operation:** Next.js API routes are ephemeral. Stateful operations (like managing bulk dispatches or tracking generation steps) are strictly offloaded to Inngest via `inngest.send()`.
- **Atomic Updates:** Whenever possible, metrics (e.g., `sentCount`, `bouncedCount`) are updated using MongoDB's `$inc` operator to prevent race conditions during concurrent webhook executions.

### Response Conventions
- **Success:** Returns HTTP `200 OK` with JSON payloads. Often includes `{ success: true }` alongside the data.
- **Validation Errors:** Returns HTTP `400 Bad Request` with an `{ error: string }` message.
- **Auth Errors:** Returns HTTP `401 Unauthorized` or `403 Forbidden` for role-based blocks.
- **Server Errors:** Returns HTTP `500 Internal Server Error`, typically unwrapping `error.message`.

---

## 2. Database Schemas (Mongoose)

Understanding the data layer is crucial for interacting with the APIs.

### User Schema (`models/User.ts`)
Manages authentication, global configuration, and encrypted credentials.
```typescript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Hashed via bcrypt
  role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
  gmailConfig: {
    address: { type: String },
    appPassword: { type: String }, // AES-256 Encrypted
    validated: { type: Boolean, default: false }
  },
  selectedModel: { type: String, default: "gemini-1.5-pro" },
  apiKeys: {
    openai: { type: String }, // AES-256 Encrypted
    anthropic: { type: String }, // AES-256 Encrypted
    gemini: { type: String }, // AES-256 Encrypted
    deepseek: { type: String } // AES-256 Encrypted
  },
  resume: {
    fileName: { type: String },
    parsedText: { type: String },
    base64Data: { type: String }
  }
}
```

### Campaign Schema (`models/Campaign.ts`)
Acts as the parent aggregator for a batch of emails.
```typescript
{
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  leadsCount: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  bouncedCount: { type: Number, default: 0 },
  totalLeads: { type: Number, default: 0 },
  autoSend: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["DRAFT", "GENERATING", "READY", "SENDING", "COMPLETED", "FAILED"],
    default: "DRAFT"
  }
}
```

### EmailLog Schema (`models/EmailLog.ts`)
The core unit of work. One document represents one email to one prospect.
```typescript
{
  campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  companyName: { type: String, required: true },
  role: { type: String },
  recipientEmail: { type: String, required: true },
  subject: { type: String },
  body: { type: String },
  status: {
    type: String,
    enum: ["PENDING", "GENERATED", "QUEUED", "SENDING", "SENT", "FAILED", "BOUNCED"],
    default: "PENDING"
  },
  messageId: { type: String }, // SMTP Message-ID (Critical for Threading/Bounces)
  generationError: { type: String },
  error: { type: String }
}
```

---

## 3. Authentication & User Management APIs

### `GET /api/user/settings`
**Purpose:** Hydrates the frontend user profile configuration context on dashboard load.
- **Auth Level:** `USER`
- **Business Logic:** Looks up the user by session email. Returns a sanitized object excluding password hashes and raw API keys.
- **Success Response:**
  ```json
  {
    "gmailConfigured": true,
    "gmailConfig": {
      "address": "sales@pitchr.com",
      "validated": true
    },
    "selectedModel": "claude-3-opus-20240229",
    "resume": {
      "fileName": "Varun_Singh_Resume.pdf",
      "parsedText": "Full Stack Engineer with 5 years...",
      "base64Data": "JVBERi0xLjQKJcO..."
    }
  }
  ```

### `POST /api/user/settings`
**Purpose:** Persists updates to basic settings, primarily the preferred LLM selection from the dropdown.
- **Auth Level:** `USER`
- **Request Payload:**
  ```typescript
  interface SettingsUpdate {
    selectedModel?: string;
  }
  ```
- **Business Logic:** Uses `User.updateOne()` to apply changes selectively.

### `GET /api/user/api-keys`
**Purpose:** Informs the UI which custom API keys the user has successfully registered.
- **Auth Level:** `USER`
- **Business Logic:** Checks the database for the existence of encrypted key strings. **Never returns the decrypted keys to the frontend.**
- **Success Response:**
  ```json
  {
    "openAiKey": true,
    "anthropicKey": false,
    "geminiKey": true,
    "deepseekKey": false
  }
  ```

### `POST /api/user/api-keys`
**Purpose:** Registers new LLM API keys.
- **Auth Level:** `USER`
- **Request Payload:**
  ```json
  {
    "openAiKey": "sk-proj-...",
    "anthropicKey": "sk-ant-api03-...",
    "geminiKey": "AIzaSy...",
    "deepseekKey": "sk-..."
  }
  ```
- **Business Logic:** For each provided key, runs `encrypt(key)` from `lib/encryption.ts` using the AES-256 algorithm and the server `.env` key. Merges updates into `apiKeys` object.

### `POST /api/validate-gmail`
**Purpose:** Verifies that a user's Gmail App Password is correct before saving it, preventing silent delivery failures later.
- **Auth Level:** `USER`
- **Request Payload:**
  ```json
  {
    "email": "user@gmail.com",
    "appPassword": "abcd efgh ijkl mnop"
  }
  ```
- **Business Logic:** 
  1. Instantiates an `ImapFlow` client.
  2. Attempts to `.connect()`.
  3. If connection succeeds, runs `.logout()`.
  4. Encrypts the `appPassword` and updates the user document: `gmailConfig: { address, appPassword: <encrypted>, validated: true }`.
- **Edge Cases:** If the App Password is invalid, Google rejects the IMAP connection, throwing a specific Auth error. Returns HTTP `400` to the UI with `error: "Invalid Gmail credentials"`.

---

## 4. Campaign Lifecycle APIs

### `POST /api/campaigns/create`
**Purpose:** Initializes an empty shell for a new campaign batch.
- **Auth Level:** `USER`
- **Request Payload:**
  ```json
  {
    "name": "Mid-Level Software Engineer Campaign - May 2026"
  }
  ```
- **Business Logic:** Instantiates a new `Campaign` document. Associates it tightly with the `userId`.
- **Success Response:**
  ```json
  {
    "_id": "663d2...",
    "userId": "663c1...",
    "name": "Mid-Level Software Engineer Campaign - May 2026",
    "status": "DRAFT",
    "leadsCount": 0,
    ...
  }
  ```

### `POST /api/campaign/start`
**Purpose:** The critical transition endpoint that passes control from the browser to the background Inngest orchestrator.
- **Auth Level:** `USER`
- **Request Payload:**
  ```typescript
  interface CampaignStartPayload {
    campaignId: string;
    leads: Array<{
      company: string;
      contact_email: string;
      role: string;
      description?: string;
      stack?: string[];
      fit_score?: string;
    }>;
    resumeText: string;
    autoSend?: boolean;
  }
  ```
- **Business Logic:**
  1. Validates input array exists.
  2. Looks up the Campaign by `_id`.
  3. Maps the `leads` array into an array of Inngest event objects.
  4. Executes `inngest.send(events)`.
  5. Updates Campaign status to `"GENERATING"` and sets the `totalLeads` count.
  6. **Data integrity:** Does NOT save the campaign state until *after* Inngest confirms receipt, preventing desyncs.
- **Success Response:** `{ "success": true, "queuedCount": 20 }`

### `GET /api/campaigns/[id]/status`
**Purpose:** Lightweight polling endpoint for the UI to monitor generation progress.
- **Auth Level:** `USER`
- **Business Logic:** Runs an aggregation or multiple `countDocuments` queries against the `EmailLog` collection filtered by `campaignId`.
- **Success Response:**
  ```json
  {
    "generated": 18,
    "failed": 0,
    "total": 20,
    "status": "GENERATING"
  }
  ```

### `GET /api/campaigns/[id]/emails`
**Purpose:** Fetches the fully generated email drafts for user review.
- **Auth Level:** `USER`
- **Business Logic:** `EmailLog.find({ campaignId }).lean()`. Returns the subject, body, recipient, and status.

### `POST /api/leads/check-sent`
**Purpose:** The duplicate detection gatekeeper. Ensures we don't spam the same HR manager twice.
- **Auth Level:** `USER`
- **Request Payload:**
  ```json
  {
    "emails": ["hr@companyA.com", "talent@companyB.com"]
  }
  ```
- **Business Logic:**
  Executes a MongoDB `$in` query:
  `EmailLog.find({ userId, recipientEmail: { $in: emails }, status: { $in: ["SENT", "GENERATED"] } })`.
- **Success Response:** Extracts only the overlapping emails and returns them: `{ "alreadySent": ["hr@companyA.com"] }`.

### `POST /api/parse-resume`
**Purpose:** OCR and text extraction utility for PDF parsing.
- **Auth Level:** `USER`
- **Business Logic:** Converts the incoming base64 payload to a Node `Buffer`. Passes the buffer to `pdf(buffer)` (from the `pdf-parse` library). Returns the raw `data.text` output.

---

## 5. SMTP Dispatch & IMAP Inbox APIs

### `POST /api/send-batch`
**Purpose:** Manages the manual (UI-driven) dispatch of a campaign batch via SMTP, streaming real-time status updates via SSE.
- **Auth Level:** `USER`
- **Headers:** `Accept: text/event-stream`
- **Request Payload:**
  ```json
  {
    "companies": [
      {
        "companyId": "663d...",
        "contactEmail": "hr@acme.com",
        "subject": "Full Stack Engineer Application",
        "body": "Hi team...",
        "company": "Acme",
        "role": "Engineer"
      }
    ],
    "resumeBase64": "JVBER...",
    "resumeFileName": "resume.pdf"
  }
  ```
- **Business Logic Execution:**
  1. Decrypts user's `appPassword`.
  2. Instantiates Nodemailer Transporter. Runs `transporter.verify()`.
  3. Opens SSE stream: `controller.enqueue(...)`.
  4. Loops through `companies`:
     a. Emits `{ type: "status", status: "sending", companyId: ... }`.
     b. Executes `transporter.sendMail()`.
     c. On success: Creates `EmailLog(status: SENT)`, saves `messageId` (CRITICAL for threading), increments `Campaign.sentCount`.
     d. On failure: Creates `EmailLog(status: FAILED)`, increments `Campaign.failedCount`.
     e. **Rate Limiting:** `await new Promise(r => setTimeout(r, 4000))` (Prevents 421 errors).
  5. Updates Campaign status to `"COMPLETED"`.
  6. Dispatches `campaign/verify.delivery` to Inngest.
  7. Dispatches `campaign/completed` to Inngest.
  8. Closes stream.

### `GET /api/inbox`
**Purpose:** Constructs a "Smart Inbox" by cross-referencing raw IMAP data with our proprietary `EmailLog` database.
- **Auth Level:** `USER`
- **Query Params:** `?page=1`
- **Business Logic:**
  1. Connects to `imap.gmail.com` via `imapflow`.
  2. Selects `INBOX`.
  3. Searches for emails `since` 7 days ago, excluding `mailer-daemon` (which are handles by verify jobs).
  4. Iterates results, extracting raw source and parsing via `mailparser`.
  5. Extracts the `In-Reply-To` header.
  6. Executes `EmailLog.find({ messageId: { $in: extractedInReplyTos } })`.
  7. Merges the inbound email data (date, snippet, body) with the Pitchr database context (Company Name, Original Role, Original Campaign).
- **Success Response:** Array of enriched threads.

### `POST /api/inbox/sync`
**Purpose:** Manual force-sync for the inbox, primarily executing the bounce-detection algorithm immediately instead of waiting for the 5-minute scheduled job.
- **Auth Level:** `USER`
- **Business Logic:**
  Similar to the background verification job:
  Searches IMAP for `[FROM: "mailer-daemon@googlemail.com", SUBJECT: "Delivery Status Notification"]`.
  Parses the body to find the original `Message-ID`.
  Transitions affected `EmailLog` records from `SENT` to `BOUNCED`.
  Adjusts `Campaign` counters.

### `POST /api/generate-reply`
**Purpose:** Drafts an AI response to an ongoing email thread.
- **Auth Level:** `USER`
- **Request Payload:**
  ```json
  {
    "emailThread": "From HR: Thanks for reaching out. What is your expected salary?\n\nFrom Me: Hi HR...",
    "context": "Tell them I am looking for $120k base."
  }
  ```
- **Business Logic:** Feeds the system prompt, thread context, and user instructions into the LLM Router.
- **Success Response:** `{ "replyBody": "Hi Team, Thanks for getting back to me. Regarding compensation..." }`

### `POST /api/send-reply`
**Purpose:** Dispatches the response back to the prospect, ensuring it threads correctly in their email client.
- **Auth Level:** `USER`
- **Request Payload:**
  ```json
  {
    "to": "hr@acme.com",
    "subject": "Re: Application",
    "body": "Hi Team...",
    "inReplyTo": "<CABcdEFG@mail.gmail.com>",
    "references": ["<CABcdEFG@mail.gmail.com>"]
  }
  ```
- **Business Logic:** Standard Nodemailer dispatch, but explicitly overrides headers.

---

## 6. Administration & Routing APIs

*These routes are protected by a strict `if (session.user.role !== "ADMIN")` guard. Unauthorized access yields HTTP 403.*

### `GET /api/admin/api-keys`
**Purpose:** Retrieves system-wide fallback LLM keys (used when users have no keys or exceed quotas).

### `POST /api/admin/api-keys`
**Purpose:** Saves system-wide keys to the database, enforcing AES-256 encryption.

### `GET /api/models/available`
**Purpose:** Router healthcheck. Evaluates which LLMs are currently active, valid, and not rate-limited.
- **Business Logic:** Checks `AdminApiKeys` and `UserApiKeys`.
- **Success Response:** `{ "models": ["gemini-1.5-pro", "claude-3-opus"] }`

---

## 7. Inngest Background Event Payloads

The Inngest API (`app/api/inngest/route.ts`) acts as the webhook receiver for Vercel/Inngest execution.

### `campaign/generate.email`
*The workhorse event for prompt execution.*
**Data Schema:**
```typescript
{
  campaignId: string;
  userId: string;
  userName: string;
  resumeText: string;
  lead: {
    company: string;
    contact_email: string;
    role: string;
    description: string;
    stack: string[];
    fit_score: string;
  }
}
```
**Flow:**
- `step.run("upsert-email-log")`: Creates the `PENDING` DB record.
- `step.run("generate-email-body")`: Calls LLM router.
- `step.run("generate-subject-line")`: Calls LLM router.
- `step.run("save-generated-email")`: Updates DB to `GENERATED`.
- `step.run("check-campaign-complete")`: Checks if all leads are done. If `autoSend == true`, emits `campaign/auto-send`.

### `campaign/auto-send`
*The background equivalent of `/api/send-batch`.*
**Data Schema:**
```typescript
{
  campaignId: string;
  userId: string;
}
```
**Flow:**
- Fetches decrypted Gmail App password.
- Fetches all `GENERATED` emails for the `campaignId`.
- Loops with a strict `await sleep(4000)`.
- Dispatches SMTP.
- Updates DB.
- Emits `verify.delivery` and `completed`.

### `campaign/verify.delivery`
*The accuracy auditor.*
**Data Schema:**
```typescript
{
  campaignId: string;
  userId: string;
}
```
**Flow:**
- **CRITICAL:** `await step.sleep("5m")` - Waits for bounces to arrive.
- Connects to IMAP.
- Searches for `mailer-daemon` messages.
- Parses `In-Reply-To` headers.
- Flips `SENT` -> `BOUNCED` in the database.

### `campaign/completed`
*The notification dispatcher.*
**Data Schema:**
```typescript
{
  campaignId: string;
  userId: string;
}
```
**Flow:**
- Extracts `GMAIL_USER` and `GMAIL_USER_PASSWORD` from environment variables (System Account).
- Formats an HTML/Text summary of the campaign (Total, Sent, Failed, Bounced).
- Dispatches to the User's personal email address.

---
*End of Technical Specification.*
