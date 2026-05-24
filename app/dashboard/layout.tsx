import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  await dbConnect();
  const dbUser = await User.findOne({ email: session.user.email }).lean();

  return (
    <DashboardShell
      user={{
        name: session.user.name || "User",
        email: session.user.email || "",
        image: session.user.image || "",
        role: dbUser?.role || "user",
        plan: dbUser?.plan || "free",
      }}
      isImpersonating={!!(session as any).isImpersonating}
    >
      {children}
    </DashboardShell>
  );
}
