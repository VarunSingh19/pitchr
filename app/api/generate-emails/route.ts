import { pooledGenerateEmailBody, pooledGenerateSubjectLine } from "@/lib/ai-client";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

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

    // Get user's selected model from MongoDB — key comes from the system pool
    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const modelId = user.selectedModel || "gemini-2.5-flash";

    // Normalize stack to string
    const stackStr = Array.isArray(company.stack)
      ? company.stack.join(", ")
      : company.stack || "Not specified";

    // Generate email body using the system key pool
    const body = await pooledGenerateEmailBody(
      {
        userName,
        resumeText,
        company: company.company,
        role: company.role,
        description: company.description || "",
        stack: stackStr,
        fitScore: String(company.fit_score || ""),
      },
      modelId
    );

    // Generate subject line using the system key pool
    const subject = await pooledGenerateSubjectLine(
      company.company,
      company.role,
      stackStr,
      userName,
      modelId
    );

    return Response.json({
      companyId: company.id,
      subject,
      body,
      status: "ready",
    });
  } catch (error) {
    // If the pool is exhausted, return 503
    if (error instanceof Error && (error as any).status === 503) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Email generation failed: ${message}` },
      { status: 500 }
    );
  }
}
