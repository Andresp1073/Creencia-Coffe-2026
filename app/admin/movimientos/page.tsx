import { getMovements } from "@/lib/admin/inventory";
import { MovementsRecentClient } from "./movements-recent-client";
import { requireAdminSession } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminMovementsRecentPage() {
  await requireAdminSession();

  const movements = await getMovements();
  return <MovementsRecentClient initialMovements={movements} />;
}