import { requireAdmin } from "@/lib/admin-auth";
import { dbConnect } from "@/lib/db";
import { verifyOrigin, forbiddenResponse } from "@/lib/auth-helpers";
import SystemPrompt from "@/models/SystemPrompt";
import { auth } from "@/auth";
import {
  EMAIL_SYSTEM_PROMPT,
  SUBJECT_SYSTEM_PROMPT,
  REFERENCE_EMAILS,
  REFERENCE_SUBJECT_LINES,
  BLACKLISTED_WORDS,
} from "@/lib/ai-client";

const PROMPT_DEFINITIONS = [
  {
    promptId: "email_system",
    name: "Email Generator Instruction",
    description: "System instructions (Persona, Persona Tone, and Negative Constraints) for writing cold emails.",
    defaultContent: EMAIL_SYSTEM_PROMPT,
  },
  {
    promptId: "subject_system",
    name: "Subject Generator Instruction",
    description: "System instructions and constraints for generating open-rate optimized email subject lines.",
    defaultContent: SUBJECT_SYSTEM_PROMPT,
  },
  {
    promptId: "few_shots_email",
    name: "Email Few-Shot Reference",
    description: "Few-shot examples demonstrating high-quality personalization, tone, and formatting constraints for cold emails.",
    defaultContent: REFERENCE_EMAILS,
  },
  {
    promptId: "few_shots_subject",
    name: "Subject Few-Shot Reference",
    description: "Few-shot examples demonstrating high-quality subject lines and their rationales.",
    defaultContent: REFERENCE_SUBJECT_LINES,
  },
  {
    promptId: "blacklisted_words",
    name: "Banned Keyword Fences",
    description: "A hard word-level blocklist to prune common AI clichés like 'passionate' or 'excited' from final outputs.",
    defaultContent: BLACKLISTED_WORDS,
  },
];

/** GET — Retrieve all prompts with overrides if present */
export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  await dbConnect();

  try {
    const overrides = await SystemPrompt.find().lean();
    const overridesMap = new Map(overrides.map((o) => [o.promptId, o]));

    const prompts = PROMPT_DEFINITIONS.map((def) => {
      const override = overridesMap.get(def.promptId);
      return {
        promptId: def.promptId,
        name: def.name,
        description: def.description,
        content: override ? override.content : def.defaultContent,
        defaultContent: def.defaultContent,
        isOverridden: !!override,
        updatedBy: override?.updatedBy || null,
        updatedAt: override?.updatedAt || null,
      };
    });

    return Response.json({ prompts });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

/** POST — Create or update a prompt override */
export async function POST(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const session = await auth();
  const adminEmail = session?.user?.email || "admin";

  try {
    const { promptId, content } = await request.json();

    if (!promptId || content === undefined) {
      return Response.json(
        { error: "promptId and content are required" },
        { status: 400 }
      );
    }

    const definition = PROMPT_DEFINITIONS.find((d) => d.promptId === promptId);
    if (!definition) {
      return Response.json({ error: "Invalid promptId" }, { status: 400 });
    }

    await dbConnect();

    // Save override
    const updated = await SystemPrompt.findOneAndUpdate(
      { promptId },
      {
        $set: {
          promptId,
          name: definition.name,
          content: content.trim(),
          updatedBy: adminEmail,
        },
      },
      { upsert: true, new: true }
    );

    return Response.json({ success: true, prompt: updated });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to save prompt override" },
      { status: 500 }
    );
  }
}

/** DELETE — Restore defaults (delete prompt override) */
export async function DELETE(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  try {
    const { promptId } = await request.json();

    if (!promptId) {
      return Response.json({ error: "promptId is required" }, { status: 400 });
    }

    await dbConnect();

    const deleted = await SystemPrompt.findOneAndDelete({ promptId });

    if (!deleted) {
      return Response.json(
        { error: "No custom override found for this prompt" },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to restore prompt defaults" },
      { status: 500 }
    );
  }
}
