import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import SubscriptionRequest from "@/models/SubscriptionRequest";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, amount, transactionId, proofFileBase64, proofFileName } = await request.json();

    if (!plan || !amount || !transactionId || !proofFileBase64 || !proofFileName) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // 1. Process base64 file data and write to disk
    const match = proofFileBase64.match(/^data:([^;]+);base64,(.+)$/);
    let fileBuffer: Buffer;
    let extension = ".png";

    if (match) {
      const mimeType = match[1];
      const extMap: Record<string, string> = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
        "application/pdf": ".pdf",
      };
      extension = extMap[mimeType] || ".png";
      fileBuffer = Buffer.from(match[2], "base64");
    } else {
      fileBuffer = Buffer.from(proofFileBase64, "base64");
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "uploads", "payment-proofs");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${user._id}-${Date.now()}${extension}`;
    const relativePath = `uploads/payment-proofs/${filename}`;
    const absolutePath = path.join(process.cwd(), "uploads", "payment-proofs", filename);

    // Save proof screenshot to disk
    await fs.promises.writeFile(absolutePath, fileBuffer);

    // 2. Save SubscriptionRequest to MongoDB
    try {
      const subRequest = await SubscriptionRequest.create({
        userId: user._id,
        plan,
        amount: Number(amount),
        transactionId: String(transactionId).trim(),
        proofFilePath: relativePath,
        proofFileName,
        status: "pending",
      });

      return Response.json(subRequest, { status: 201 });
    } catch (dbError: any) {
      // Clean up the saved file on DB failure so we don't leave orphaned files on disk
      try {
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
      }

      // Check specifically for MongoDB duplicate key error code 11000
      if (dbError.code === 11000) {
        return Response.json(
          { error: "This transaction ID has already been submitted." },
          { status: 409 }
        );
      }

      throw dbError; // bubble up for general 500 handler
    }

  } catch (error) {
    console.error("Subscription proof upload error:", error);
    return Response.json({ error: "Failed to submit subscription request" }, { status: 500 });
  }
}
