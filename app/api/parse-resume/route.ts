import { PDFParse } from "pdf-parse";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileBase64 } = await request.json();

    if (!fileBase64) {
      return Response.json(
        { error: "No file data provided" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(fileBase64, "base64");

    // Validate file size (5MB limit)
    if (buffer.length > 5 * 1024 * 1024) {
      return Response.json(
        { error: "File too large. Maximum 5MB." },
        { status: 400 }
      );
    }

    // pdf-parse v2 uses a class-based API
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    let text: string = result.text || "";

    // Clean extracted text
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    const wordCount = text.split(/\s+/).filter(Boolean).length;

    if (wordCount < 10) {
      return Response.json(
        { error: "Could not extract meaningful text from the PDF. Make sure it's not a scanned image." },
        { status: 422 }
      );
    }

    await parser.destroy();

    return Response.json({ text, wordCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Failed to parse PDF: ${message}` },
      { status: 500 }
    );
  }
}
