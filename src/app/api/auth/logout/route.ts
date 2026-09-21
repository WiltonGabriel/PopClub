import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookies, SESSION_COOKIE_NAME, LEGACY_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(LEGACY_COOKIE_NAME);

    const response = NextResponse.json({ success: true });
    clearSessionCookies(response);
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao encerrar sessão" }, { status: 500 });
  }
}

