# Pitchr Detailed API Documentation

This document provides a comprehensive technical reference for the Pitchr backend. It covers all Next.js API routes, request/response structures, HTTP status codes, edge cases, and background event schemas.

All API routes are located under `app/api/`.
Unless specified otherwise, all routes require an active NextAuth session cookie (`role: "USER"` or `"ADMIN"`).

---

## Table of Contents

1. [Authentication & Users](#1-authentication--users)
2. [Campaigns & Generation](#2-campaigns--generation)
3. [Email Dispatch & Inbox](#3-email-dispatch--inbox)
4. [Administration](#4-administration)
5. [Inngest Background Jobs](#5-inngest-background-jobs)

---

## 1. Authentication & Users

### `GET /api/user/settings`
Fetches the authenticated user's profile settings, including their Gmail connection status and preferred LLM model.

- **Auth Required:** Yes
- **Success Response (200 OK):**
  ```json
  {
    "gmailConfigured": true,
    "gmailConfig": { "address": "user@gmail.com", "validated": true },
    "selectedModel": "claude-3-opus-20240229",
    "resume": { "fileName": "resume.pdf", "parsedText": "...", "base64Data": "..." }
  }
  ```
- **Error Responses:** `401 Unauthorized` (No session), `404 Not Found` (User missing in DB).

### `POST /api/user/settings`
Updates the user's basic application settings.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "selectedModel": "gemini-1.5-pro"
  }
  ```
- **Success Response (200 OK):** `{ "success": true }`
- **Error Responses:** `400 Bad Request` (Invalid payload), `500 Internal Server Error`.

### `GET /api/user/api-keys`
Retrieves the user's custom LLM API keys. (Note: Keys are masked or verified before return; raw keys are heavily encrypted).

- **Auth Required:** Yes
- **Success Response (200 OK):**
  ```json
  {
    "openAiKey": true,
    "anthropicKey": false,
    "geminiKey": true,
    "deepseekKey": false
  }
  ```

### `POST /api/user/api-keys`
Saves or updates user-specific LLM API keys. Keys are passed to the `encrypt()` utility before persisting to MongoDB.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "openAiKey": "sk-...",
    "anthropicKey": "sk-ant-...",
    "geminiKey": "AIza...",
    "deepseekKey": "sk-deep..."
  }
  ```
- **Success Response (200 OK):** `{ "success": true }`

### `POST /api/validate-gmail`
Verifies a user's Gmail App Password by attempting an active IMAP connection using `imapflow`. If successful, the credentials are encrypted and stored.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "email": "user@gmail.com",
    "appPassword": "abcd efgh ijkl mnop"
  }
  ```
- **Success Response (200 OK):** `{ "success": true, "message": "Gmail verified and saved successfully" }`
- **Error Responses:** `400 Bad Request` (Invalid credentials / IMAP connection failed).

---

## 2. Campaigns & Generation

### `POST /api/campaigns/create`
Initializes a new blank campaign in the database.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "name": "Campaign May 9"
  }
  ```
- **Success Response (200 OK):** Returns the newly created Mongoose `Campaign` document.
- **Edge Cases:** If `name` is omitted, returns `400 Bad Request`.

### `POST /api/campaign/start`
Triggers the background AI generation of emails for a campaign via Inngest. This offloads heavy LLM processing from the main Next.js thread.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "campaignId": "65b9a...",
    "leads": [
      { "company": "Acme Corp", "contact_email": "hr@acme.com", "role": "Engineer", ... }
    ],
    "resumeText": "Extracted text from PDF...",
    "autoSend": true
  }
  ```
- **Success Response (200 OK):** `{ "success": true, "queuedCount": 1 }`
- **Side Effects:** Dispatches `N` events to Inngest (`campaign/generate.email`), where `N` is `leads.length`.

### `GET /api/campaigns/[id]/status`
Polls the generation status of a specific campaign. Used by the UI progress bar.

- **Auth Required:** Yes
- **Success Response (200 OK):**
  ```json
  {
    "generated": 15,
    "failed": 2,
    "total": 20,
    "status": "GENERATING"
  }
  ```
- **Edge Cases:** Returns `404 Not Found` if `campaignId` does not belong to the user.

### `GET /api/campaigns/[id]/emails`
Retrieves all generated email drafts for a campaign so the user can review/edit them.

- **Auth Required:** Yes
- **Success Response (200 OK):** Array of populated `EmailLog` documents.

### `POST /api/leads/check-sent`
Cross-references a list of lead emails against the user's historical `EmailLog` to prevent duplicate outreach.

- **Auth Required:** Yes
- **Request Body:** `{ "emails": ["ceo@acme.com", "hr@tech.io"] }`
- **Success Response (200 OK):** `{ "alreadySent": ["ceo@acme.com"] }`

### `POST /api/parse-resume`
Extracts raw text from a base64-encoded PDF resume using the `pdf-parse` module.

- **Auth Required:** Yes
- **Request Body:** `{ "fileBase64": "JVBERi0xLjQK..." }`
- **Success Response (200 OK):** `{ "text": "John Doe\nSoftware Engineer..." }`
- **Error Responses:** `400 Bad Request` (Invalid PDF buffer), `500 Internal Server Error` (Parsing failure).

---

## 3. Email Dispatch & Inbox

### `POST /api/send-batch`
Executes manual batch sending using Server-Sent Events (SSE). Streams real-time progress to the UI.

- **Auth Required:** Yes
- **Headers:** `Accept: text/event-stream`
- **Request Body:**
  ```json
  {
    "companies": [
      { "companyId": "1", "contactEmail": "hr@acme.com", "subject": "Hello", "body": "...", "company": "Acme Corp", "role": "Engineer" }
    ],
    "resumeBase64": "...",
    "resumeFileName": "resume.pdf"
  }
  ```
- **Rate Limiting:** Enforces a hard `await new Promise(r => setTimeout(r, 4000))` (4 seconds) between dispatches to prevent Gmail SMTP 421 Rate Limit errors.
- **Side Effects:** Updates `EmailLog` (Status: SENT/FAILED). Updates `Campaign` counts. Triggers `campaign/verify.delivery` and `campaign/completed` Inngest events at the end.

### `GET /api/inbox`
Connects to Gmail via IMAP and fetches recent replies to emails dispatched through Pitchr. Uses `Message-ID` threading to match incoming emails to `EmailLog` records.

- **Auth Required:** Yes
- **Success Response (200 OK):**
  ```json
  [
    {
      "threadId": "18de...",
      "companyName": "Acme Corp",
      "latestReply": "...",
      "replyDate": "2024-05-09T10:00:00Z"
    }
  ]
  ```

### `POST /api/inbox/sync`
Manually forces an IMAP sync. Critically, this route parses the inbox for **Delivery Status Notifications (DSNs)** and Mailer-Daemon bounces.

- **Auth Required:** Yes
- **Logic Flow:**
  1. Searches INBOX for last 14 days.
  2. Parses `In-Reply-To` or `References` headers.
  3. If sender is `mailer-daemon@googlemail.com` or subject contains "Delivery Status Notification", flags the associated `EmailLog` as `BOUNCED`.
  4. Decrements `Campaign.sentCount` and increments `Campaign.bouncedCount` atomically.
- **Success Response (200 OK):** `{ "success": true, "syncedReplies": 2, "bouncesDetected": 1 }`

### `POST /api/generate-reply`
Uses the LLM router to draft a contextual response to an incoming email thread.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "emailThread": "Original: Hello\nReply: Thanks, but we need more info...",
    "context": "Tell them I have 5 years of React experience."
  }
  ```
- **Success Response (200 OK):** `{ "replyBody": "Hi, I'd be happy to clarify. I have 5 years..." }`

### `POST /api/send-reply`
Dispatches an SMTP reply to an existing thread. Ensures the thread does not break in the recipient's inbox.

- **Auth Required:** Yes
- **Request Body:** `{ "to": "hr@acme.com", "subject": "Re: Application", "body": "...", "inReplyTo": "<orig-msg-id>", "references": ["<orig-msg-id>"] }`

---

## 4. Administration

*These routes enforce an explicit `if (session.user.role !== "ADMIN") return 403 Forbidden` check.*

### `GET /api/admin/api-keys`
Fetches platform-wide fallback API keys stored in the database.

- **Auth Required:** Yes (ADMIN)
- **Response:** `{ "openAiKey": true, "geminiKey": false, ... }`

### `POST /api/admin/api-keys`
Updates platform-wide fallback API keys. These keys are used when a standard user hasn't provided their own keys.

- **Auth Required:** Yes (ADMIN)
- **Request Body:** `{ "openAiKey": "sk-...", ... }`
- **Success Response (200 OK):** `{ "success": true }`

### `GET /api/models/available`
Checks the health of the LLM Router. Returns a list of AI models that are currently available and not rate-limited.

- **Auth Required:** Yes (ADMIN/USER)
- **Response:** `{ "models": ["gemini-1.5-pro", "claude-3-opus", "gpt-4o"] }`

---

## 5. Inngest Background Jobs

Pitchr relies heavily on `app/api/inngest/route.ts` to orchestrate background workloads.

### Event: `campaign/generate.email`
- **Triggered By:** `POST /api/campaign/start`
- **Function:** `generateSingleEmail`
- **Payload:** `{ campaignId, lead, userId, resumeText, userName }`
- **Action:** Calls `pooledGenerateEmailBody` and `pooledGenerateSubjectLine`. Fallbacks automatically on 429/500 errors. Saves to `EmailLog`. Checks if the campaign is fully generated; if so, and `autoSend` is true, triggers `campaign/auto-send`.

### Event: `campaign/auto-send`
- **Triggered By:** `generateSingleEmail` completion logic.
- **Function:** `autoSendCampaign`
- **Payload:** `{ campaignId, userId }`
- **Action:** Fetches all `GENERATED` emails. Dispatches them sequentially via SMTP with a 4-second delay. Updates `Campaign.sentCount`. Triggers `campaign/completed` and `campaign/verify.delivery` when done.

### Event: `campaign/completed`
- **Triggered By:** `autoSendCampaign` or `POST /api/send-batch`.
- **Function:** `sendCompletionEmail`
- **Payload:** `{ campaignId, userId }`
- **Action:** Uses the system `.env` Gmail account to send a branded summary email (Total, Sent, Failed, Bounced) to the user's personal inbox.

### Event: `campaign/verify.delivery`
- **Triggered By:** `autoSendCampaign` or `POST /api/send-batch`.
- **Function:** `verifyDelivery`
- **Payload:** `{ campaignId, userId }`
- **Action:** Pauses via `step.sleep("5m")`. Connects to Gmail IMAP. Scans the last hour for `mailer-daemon` bounces. Updates `EmailLog` statuses to `BOUNCED` and fixes `Campaign` metrics.
