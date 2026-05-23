import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import SubscriptionRequest from "@/models/SubscriptionRequest";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    // Fetch all requests and populate the userId reference with name and email
    const requests = await SubscriptionRequest.find({})
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return Response.json(requests);
  } catch (error) {
    console.error("Admin subscription requests fetch error:", error);
    return Response.json({ error: "Failed to fetch subscription requests" }, { status: 500 });
  }
}
