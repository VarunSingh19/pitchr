import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Server-side admin role check
  const adminAccess = await isAdmin();
  if (!adminAccess) {
    redirect("/dashboard");
  }

  return (
    <AdminShell
      user={{
        name: session.user.name || "Admin",
        email: session.user.email || "",
        image: session.user.image || "",
      }}
    >
      {children}
    </AdminShell>
  );
}
