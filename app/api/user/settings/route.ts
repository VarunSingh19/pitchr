import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { verifyOrigin, forbiddenResponse } from "@/lib/auth-helpers";
import { isValidModel } from "@/lib/models-config";

/** GET — Fetch user settings */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    return Response.json({
      selectedModel: "gemini-2.5-flash",
      gmailConfigured: false,
      gmailConfig: null,
    });
  }

  return Response.json({
    selectedModel: user.selectedModel,
    gmailConfigured: user.gmailConfig?.validated ?? false,
    gmailConfig: user.gmailConfig
      ? {
          address: user.gmailConfig.address,
          validated: user.gmailConfig.validated,
          // Never return the encrypted appPassword
        }
      : null,
    resume: user.resume ? {
      fileName: user.resume.fileName,
      parsedText: user.resume.parsedText,
    } : null,
    promptConfig: user.promptConfig || {
      targetGeography: "Mumbai — specifically Malad and Andheri areas (also accept nearby: Goregaon, Jogeshwari, MIDC, SV Road, WEH, Link Road corridors)",
      targetRoles: ["Full Stack Developer", "React Developer", "Node.js Developer", "MERN Stack Developer"],
      targetStack: ["React", "Node.js", "MongoDB", "Express", "JavaScript", "TypeScript"],
      companyTypes: ["Product startups", "IT services firms", "SaaS companies", "agencies actively posting jobs"],
      minJobAgeDays: 90,
      researcherLocation: "Mumbai, Maharashtra",
      hasConfigured: false,
    },
  });
}

/** PATCH — Update settings (model, gmail config) */
export async function PATCH(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Update selected model
  if (body.selectedModel) {
    if (!isValidModel(body.selectedModel)) {
      return Response.json(
        { error: "Invalid model ID" },
        { status: 400 }
      );
    }
    
    // Check if the model is allowed for this user
    const allowedModels = user.quotas?.allowedModels ?? ["gemini-2.5-flash", "nvidia/llama-3.1-405b-instruct"];
    if (!allowedModels.includes(body.selectedModel)) {
      return Response.json(
        { error: "Selected model is not allowed on your account level" },
        { status: 403 }
      );
    }

    user.selectedModel = body.selectedModel;
  }

  // Update Gmail config
  if (body.gmailConfig) {
    user.gmailConfig = {
      address: body.gmailConfig.address || "",
      appPassword: body.gmailConfig.appPassword || "", // Encrypted by pre-save hook
      validated: body.gmailConfig.validated ?? false,
    };
  }

  // Update Prompt Config
  if (body.promptConfig) {
    user.promptConfig = {
      targetGeography: body.promptConfig.targetGeography || "",
      targetRoles: Array.isArray(body.promptConfig.targetRoles) ? body.promptConfig.targetRoles : [],
      targetStack: Array.isArray(body.promptConfig.targetStack) ? body.promptConfig.targetStack : [],
      companyTypes: Array.isArray(body.promptConfig.companyTypes) ? body.promptConfig.companyTypes : [],
      minJobAgeDays: Number(body.promptConfig.minJobAgeDays) || 90,
      researcherLocation: body.promptConfig.researcherLocation || "",
      hasConfigured: body.promptConfig.hasConfigured ?? true,
    };
  }

  await user.save();

  return Response.json({ success: true });
}
