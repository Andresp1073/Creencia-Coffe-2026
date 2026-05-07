import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import AdminLayoutClient from "./admin-layout-client";

async function checkAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await checkAuth();
  
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}