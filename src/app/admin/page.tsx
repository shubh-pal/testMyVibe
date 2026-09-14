import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import AdminDashboard from "@/components/AdminDashboard";

export default async function AdminPage() {
  const admin = await requireSuperAdmin();
  if (!admin) redirect("/dashboard");
  return <AdminDashboard />;
}
