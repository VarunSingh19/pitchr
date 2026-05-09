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

  await user.save();

  return Response.json({ success: true });
}
