import { auth } from "@/auth";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { filename } = await params;
    
    // Prevent directory traversal attacks
    const cleanFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), "uploads", "payment-qr", cleanFilename);

    if (!fs.existsSync(filePath)) {
      return new Response("File not found", { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Serve QR error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
