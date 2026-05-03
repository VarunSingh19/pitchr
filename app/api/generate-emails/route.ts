import { generateEmailBody, generateSubjectLine } from "@/lib/gemini";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { decrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { company, resumeText, userName } = await request.json();

    if (!company || !resumeText || !userName) {
      return Response.json(
        { error: "Missing required fields: company, resumeText, userName" },
        { status: 400 }
      );
    }

    // Get user's API key and model from MongoDB
    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Find the default API key
    const defaultKey = user.apiKeys.find((k: { isDefault: boolean }) => k.isDefault) || user.apiKeys[0];

    if (!defaultKey) {
      return Response.json(
        { error: "No API key configured. Add one in Settings." },
        { status: 400 }
      );
    }

    // Decrypt the API key for the actual call
    const decryptedKey = decrypt(defaultKey.key);
    const modelName = user.selectedModel;

    // Normalize stack to string
    const stackStr = Array.isArray(company.stack)
      ? company.stack.join(", ")
      : company.stack || "Not specified";

    // Generate email body
    const body = await generateEmailBody(
      {
        userName,
        resumeText,
        company: company.company,
        role: company.role,
        description: company.description || "",
        stack: stackStr,
        fitScore: String(company.fit_score || ""),
      },
      decryptedKey,
      modelName
    );

    // Generate subject line
    const subject = await generateSubjectLine(
      company.company,
      company.role,
      stackStr,
      userName,
      decryptedKey,
      modelName
    );

    return Response.json({
      companyId: company.id,
      subject,
      body,
      status: "ready",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Email generation failed: ${message}` },
      { status: 500 }
    );
  }
}
