import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth/session";
import AdminLayoutClient from "./admin-layout-client";

const COOKIE_NAME = "cafe-creencia-session";

async function verifySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!token) {
    redirect("/login");
  }
  
  const session = await verifyToken(token);
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
  await verifySession();
  
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}