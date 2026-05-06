import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { generateReply } from "@/lib/ai-client";
import { decrypt } from "@/lib/encryption";

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

    // Determine the user's selected provider and API key
    const modelId = user.selectedModel || "gemini-1.5-flash";
    const provider = modelId.startsWith("meta/") || modelId.startsWith("mistral/") ? "nvidia" : "gemini";
    
    const keyRecord = user.apiKeys?.find((k: any) => k.provider === provider && k.isDefault);
    if (!keyRecord) {
      return Response.json({ error: `Please configure a default API key for ${provider}` }, { status: 400 });
    }

    const apiKey = decrypt(keyRecord.key);

    const generatedReply = await generateReply(
      emailText,
      user.resume.parsedText,
      modelId,
      apiKey
    );

    return Response.json({ reply: generatedReply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Failed to generate reply: ${message}` }, { status: 500 });
  }
}
