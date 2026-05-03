import { createTransporter } from "@/lib/mailer";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, appPassword } = await request.json();

    if (!email || !appPassword) {
      return Response.json(
        { valid: false, error: "Email and app password are required" },
        { status: 400 }
      );
    }

    if (appPassword.length !== 16) {
      return Response.json(
        { valid: false, error: "App password must be exactly 16 characters" },
        { status: 400 }
      );
    }

    const transporter = createTransporter(email, appPassword);
    await transporter.verify();

    return Response.json({ valid: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    // Provide user-friendly error messages
    if (message.includes("Invalid login") || message.includes("auth")) {
      return Response.json({
        valid: false,
        error: "Invalid credentials. Check your email and App Password.",
      });
    }

    return Response.json({
      valid: false,
      error: "Failed to connect to Gmail. Please try again.",
    });
  }
}
