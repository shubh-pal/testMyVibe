import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireSuperAdmin();
  if (!admin) redirect("/dashboard");
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
