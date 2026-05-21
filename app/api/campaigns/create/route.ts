import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import Campaign from "@/models/Campaign";
import User from "@/models/User";

import { checkUserQuotas } from "@/lib/quota";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Check campaigns limit quota
    const quotaCheck = await checkUserQuotas(user);
    if (!quotaCheck.allowed) {
      return Response.json({ error: quotaCheck.reason }, { status: 403 });
    }

    const campaign = await Campaign.create({
      userId: user._id,
      name: name || `Campaign ${new Date().toLocaleDateString()}`,
      status: "DRAFT",
    });

    return Response.json(campaign);
  } catch (error) {
    return Response.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
