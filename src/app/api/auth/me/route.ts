import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({ user }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao obter usuário atual" }, { status: 500 });
  }
}
