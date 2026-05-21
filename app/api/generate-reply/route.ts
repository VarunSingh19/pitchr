import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { pooledGenerateReply } from "@/lib/ai-client";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailText } = await request.json();
    if (!emailText) {
      return Response.json({ error: "Email text is required" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user || !user.resume?.parsedText) {
      return Response.json({ error: "Resume not found. Please upload it in settings." }, { status: 400 });
    }

    const { resolveUserSelectedModel } = await import("@/lib/quota");
    let modelId: string;
    try {
      modelId = await resolveUserSelectedModel(user);
    } catch (e: any) {
      return Response.json(
        { error: e.message || "No active AI models are available in the system." },
        { status: 503 }
      );
    }

    const generatedReply = await pooledGenerateReply(
      emailText,
      user.resume.parsedText,
      modelId,
      user._id.toString()
    );

    return Response.json({ reply: generatedReply });
  } catch (error) {
    // If the pool is exhausted, return 503
    if (error instanceof Error && (error as any).status === 503) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Failed to generate reply: ${message}` }, { status: 500 });
  }
}
