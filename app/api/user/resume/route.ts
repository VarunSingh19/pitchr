import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { verifyOrigin, forbiddenResponse } from "@/lib/auth-helpers";
import { promises as fs } from "fs";
import path from "path";
import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

// Increase max payload size for PDF uploads
export const maxDuration = 60; // 60 seconds

export async function POST(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Validation: 5MB size limit
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
    }

    // Validation: PDF MIME type only
    if (file.type !== "application/pdf") {
      return Response.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the PDF text for generation
    const parser = new PDFParse({ data: buffer, CanvasFactory });
    const result = await parser.getText();
    const parsedText = (result.text || "").trim();
    await parser.destroy();

    if (!parsedText || parsedText.length < 50) {
      return Response.json({ error: "Could not extract enough text from this PDF. Please ensure it's not an image-only PDF." }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Convert to base64 to store in MongoDB since Vercel is a read-only filesystem
    const base64Data = buffer.toString("base64");

    // Save to DB
    user.resume = {
      fileName: file.name,
      base64Data: base64Data,
      parsedText: parsedText,
    };

    await user.save();

    return Response.json({
      success: true,
      resume: {
        fileName: file.name,
      },
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Resume upload failed: ${message}` }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!verifyOrigin(request)) return forbiddenResponse();

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    user.resume = null;
    await user.save();

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Resume deletion failed: ${message}` }, { status: 500 });
  }
}
