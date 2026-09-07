import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao encerrar sessão" }, { status: 500 });
  }
}
