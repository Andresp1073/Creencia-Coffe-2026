import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "./session";

const COOKIE_NAME = "cafe-creencia-session";

export async function requireAdminSession() {
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