import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  AdminUserServiceError,
  createCustomRole,
  listCustomRoles,
} from "@/services/adminUserManagementService";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    const result = await listCustomRoles(authUser);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof AdminUserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erro ao listar cargos customizados:", error);
    return NextResponse.json({ error: "Erro ao listar cargos customizados." }, { status: 500 });
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

    const newRole = await createCustomRole(authUser, body);
    return NextResponse.json(newRole, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AdminUserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erro ao criar cargo customizado:", error);
    return NextResponse.json({ error: "Erro ao criar cargo customizado." }, { status: 500 });
  }
}
