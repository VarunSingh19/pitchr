import { inngest } from "./client";
import { generateEmailBody, generateSubjectLine } from "@/lib/ai-client";
import { dbConnect } from "@/lib/db";
import User, { type IApiKey } from "@/models/User"; 
import EmailLog from "@/models/EmailLog";
import { decrypt } from "@/lib/encryption";
import { getProviderForModel } from "@/lib/models-config";
import { Types } from "mongoose";

export const generateSingleEmail = inngest.createFunction(
  { id: "generate-single-email", retries: 5 },
  { event: "campaign/generate.email" },
  async ({ event, step }) => {
    const { campaignId, lead, userId, resumeText, userName } = event.data;

    const { logId, shouldAbort } = await step.run("upsert-email-log", async () => {
      await dbConnect();

      const filter = {
        campaignId: new Types.ObjectId(campaignId),
        recipientEmail: lead.contact_email,
        companyName: lead.company,
      };

      const existingLog = await EmailLog.findOne(filter);

      if (
        existingLog &&
        ["GENERATED", "SENT", "QUEUED", "SENDING"].includes(existingLog.status)
      ) {
        return { logId: existingLog._id.toString(), shouldAbort: true };
      }

      if (existingLog) {
        await EmailLog.findByIdAndUpdate(existingLog._id, {
          status: "QUEUED",
          generationError: null,
        });
        return { logId: existingLog._id.toString(), shouldAbort: false };
      }

      const newLog = await EmailLog.findOneAndUpdate(
        filter,
        {
          $setOnInsert: {
            campaignId: new Types.ObjectId(campaignId),
            userId: new Types.ObjectId(userId),
            companyName: lead.company,
            role: lead.role,
            recipientEmail: lead.contact_email,
            subject: "Drafting...",
            body: "Drafting...",
            status: "QUEUED",
            retryCount: 0,
          },
        },
        { upsert: true, new: true }
      );

      return { logId: newLog._id.toString(), shouldAbort: false };
    });

    if (shouldAbort) {
      return { message: "Already generated or in progress", logId };
    }

    const { decryptedKey, modelName } = await step.run("fetch-user-and-key", async () => {
      await dbConnect();

      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      const model = user.selectedModel;
      const provider = getProviderForModel(model);

      // ✅ Use IApiKey directly — no inline type annotation fighting the union type
      const matchingKey: IApiKey | undefined =
        user.apiKeys.find((k: IApiKey) => k.provider === provider && k.isDefault) ??
        user.apiKeys.find((k: IApiKey) => k.provider === provider);

      if (!matchingKey) {
        throw new Error(
          `No ${provider?.toUpperCase()} API key configured for model "${model}".`
        );
      }

      return {
        decryptedKey: decrypt(matchingKey.key),
        modelName: model,
      };
    });

    const body = await step.run("generate-email-body", async () => {
      const stackStr = Array.isArray(lead.stack)
        ? lead.stack.join(", ")
        : lead.stack || "Not specified";

      return generateEmailBody(
        {
          userName,
          resumeText,
          company: lead.company,
          role: lead.role,
          description: lead.description || "",
          stack: stackStr,
          fitScore: String(lead.fit_score || ""),
        },
        decryptedKey,
        modelName
      );
    });

    const subject = await step.run("generate-subject-line", async () => {
      const stackStr = Array.isArray(lead.stack)
        ? lead.stack.join(", ")
        : lead.stack || "Not specified";

      return generateSubjectLine(
        lead.company,
        lead.role,
        stackStr,
        userName,
        decryptedKey,
        modelName
      );
    });

    await step.run("save-generated-email", async () => {
      await dbConnect();

      await EmailLog.findByIdAndUpdate(logId, {
        subject,
        body,
        status: "GENERATED",
        generationError: null,
      });
    });

    return { success: true, logId };
  }
);