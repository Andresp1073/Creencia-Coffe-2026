import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
}

export async function GET() {
  try {
    const user = await queryOne<AdminUser>(
      "SELECT id, username, password_hash FROM admin_users WHERE username = 'creencia' LIMIT 1"
    );
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      user: {
        id: user.id,
        username: user.username,
        hash: user.password_hash?.substring(0, 50) + "..."
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}