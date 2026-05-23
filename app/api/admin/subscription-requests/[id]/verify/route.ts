import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import SubscriptionRequest from "@/models/SubscriptionRequest";
import { updateUserPlanQuotas } from "@/lib/quota";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status, adminNotes } = await request.json();

    if (!status || !["approved", "rejected"].includes(status)) {
      return Response.json({ error: "Invalid status value" }, { status: 400 });
    }

    await dbConnect();
    const subRequest = await SubscriptionRequest.findById(id);
    if (!subRequest) {
      return Response.json({ error: "Request not found" }, { status: 404 });
    }

    if (subRequest.status !== "pending") {
      return Response.json({ error: "This request has already been processed" }, { status: 400 });
    }

    subRequest.status = status;
    subRequest.adminNotes = adminNotes || "";
    subRequest.reviewedAt = new Date();
    await subRequest.save();

    if (status === "approved") {
      // Upgrade user plan and rescale quotas
      await updateUserPlanQuotas(subRequest.userId, subRequest.plan);
    }

    return Response.json(subRequest);
  } catch (error) {
    console.error("Admin subscription verification error:", error);
    return Response.json({ error: "Failed to process request" }, { status: 500 });
  }
}
