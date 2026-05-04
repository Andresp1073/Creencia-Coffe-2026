import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";

interface Params {
  params: Promise<{ id: string }>;
}

// PUT mark notification as read
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await requireApiAuth(request);
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const { id } = await params;
    await query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
    return NextResponse.json({ message: "Notificación marcada como leída" });
  } catch {
    return NextResponse.json({ message: "Notificación marcada como leída" });
  }
}

// DELETE single notification
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireApiAuth(request);
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const { id } = await params;
    await query("DELETE FROM notifications WHERE id = ?", [id]);
    return NextResponse.json({ message: "Notificación eliminada" });
  } catch {
    return NextResponse.json({ message: "Notificación eliminada" });
  }
}