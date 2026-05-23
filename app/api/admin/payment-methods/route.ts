import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import PaymentMethod from "@/models/PaymentMethod";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const methods = await PaymentMethod.find({}).sort({ createdAt: -1 }).lean();
    return Response.json(methods);
  } catch (error) {
    console.error("Admin payment methods fetch error:", error);
    return Response.json({ error: "Failed to fetch payment methods" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, label, value } = await request.json();

    if (!type || !label || !value) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    if (type === "upi") {
      const method = await PaymentMethod.create({
        type,
        label,
        value: String(value).trim(),
      });
      return Response.json(method, { status: 201 });
    } else {
      // QR Code: save to disk and store relative path
      const method = await PaymentMethod.create({
        type,
        label,
        value: "pending-file-save",
      });

      try {
        const match = value.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
        let fileBuffer: Buffer;
        if (match) {
          fileBuffer = Buffer.from(match[2], "base64");
        } else {
          fileBuffer = Buffer.from(value, "base64");
        }

        const uploadDir = path.join(process.cwd(), "uploads", "payment-qr");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filename = `${method._id}.png`;
        const relativePath = `uploads/payment-qr/${filename}`;
        const absolutePath = path.join(uploadDir, filename);

        await fs.promises.writeFile(absolutePath, fileBuffer);

        method.value = relativePath;
        await method.save();

        return Response.json(method, { status: 201 });
      } catch (err) {
        await PaymentMethod.findByIdAndDelete(method._id);
        throw err;
      }
    }
  } catch (error) {
    console.error("Admin payment methods create error:", error);
    return Response.json({ error: "Failed to create payment method" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, isActive } = await request.json();
    if (!id || typeof isActive !== "boolean") {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();
    const method = await PaymentMethod.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );
    if (!method) {
      return Response.json({ error: "Payment method not found" }, { status: 404 });
    }

    return Response.json(method);
  } catch (error) {
    console.error("Admin payment methods toggle error:", error);
    return Response.json({ error: "Failed to update payment method" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();
    const method = await PaymentMethod.findById(id);
    if (!method) {
      return Response.json({ error: "Payment method not found" }, { status: 404 });
    }

    // If QR, delete file from disk
    if (method.type === "qr_code" && method.value.startsWith("uploads/")) {
      try {
        const absolutePath = path.join(process.cwd(), method.value);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (err) {
        console.error("Failed to delete QR file:", err);
      }
    }

    await PaymentMethod.findByIdAndDelete(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Admin payment methods delete error:", error);
    return Response.json({ error: "Failed to delete payment method" }, { status: 500 });
  }
}
