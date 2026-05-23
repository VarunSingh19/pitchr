import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import SubscriptionRequest from "@/models/SubscriptionRequest";

export async function GET() {
  try {
    await dbConnect();
    
    // Find the user varunsinghh2409@gmail.com
    const user = await User.findOne({ email: "varunsinghh2409@gmail.com" }).lean();
    const requests = await SubscriptionRequest.find({ userId: user?._id }).lean();
    
    console.log("DEBUG_USER_DOC:", JSON.stringify(user, null, 2));
    
    return Response.json({
      user,
      requests
    });
  } catch (error: any) {
    return Response.json({ error: error.message });
  }
}
