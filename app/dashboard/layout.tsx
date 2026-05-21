import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      user={{
        name: session.user.name || "User",
        email: session.user.email || "",
        image: session.user.image || "",
        role: (session.user as unknown as Record<string, unknown>).role as string || "user",
      }}
      isImpersonating={!!(session as any).isImpersonating}
    >
      {children}
    </DashboardShell>
  );
}
