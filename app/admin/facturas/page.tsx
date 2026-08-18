import { getInvoices } from "@/lib/admin/invoices";
import { AdminFacturasClient } from "./admin-facturas-client";
import { requireAdminSession } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminFacturasPage() {
  await requireAdminSession();
  const invoices = await getInvoices();
  return <AdminFacturasClient initialInvoices={invoices} />;
}