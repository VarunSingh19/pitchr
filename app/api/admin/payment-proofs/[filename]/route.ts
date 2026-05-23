import { auth } from "@/auth";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (role !== "admin") {
      return new Response("Unauthorized", { status: 401 });
    }

    const { filename } = await params;
    
    // Block directory traversal attacks
    const cleanFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), "uploads", "payment-proofs", cleanFilename);

    if (!fs.existsSync(filePath)) {
      return new Response("File not found", { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    const ext = path.extname(cleanFilename).toLowerCase();
    
    let mimeType = "application/octet-stream";
    if (ext === ".png") mimeType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".pdf") mimeType = "application/pdf";

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Serve payment proof error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
