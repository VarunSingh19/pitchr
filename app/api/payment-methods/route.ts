import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import PaymentMethod from "@/models/PaymentMethod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const methods = await PaymentMethod.find({ isActive: true }).select("_id type label value").lean();
    return Response.json(methods);
  } catch (error) {
    console.error("Payment methods fetch error:", error);
    return Response.json({ error: "Failed to fetch payment methods" }, { status: 500 });
  }
}
