import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  AdminUserServiceError,
  createStaffUser,
  listAdminUsers,
} from "@/services/adminUserManagementService";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const result = await listAdminUsers(authUser, searchParams);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof AdminUserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erro ao listar usuários:", error);
    return NextResponse.json({ error: "Erro ao listar usuários." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const newUser = await createStaffUser(authUser, body);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AdminUserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erro ao cadastrar membro da equipe:", error);
    return NextResponse.json({ error: "Erro ao cadastrar membro da equipe." }, { status: 500 });
  }
}
