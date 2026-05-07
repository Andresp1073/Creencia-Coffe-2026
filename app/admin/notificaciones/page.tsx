import { requireAdminSession } from "@/lib/auth/require-admin";
import { NotificacionesClient } from "./notificaciones-client";

export const dynamic = "force-dynamic";

export default async function NotificacionesPage() {
  await requireAdminSession();
  
  return <NotificacionesClient />;
}