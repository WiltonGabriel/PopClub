import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  AdminUserServiceError,
  deleteCustomRole,
  updateCustomRole,
} from "@/services/adminUserManagementService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const updatedRole = await updateCustomRole(authUser, id, body);
    return NextResponse.json(updatedRole);
  } catch (error: unknown) {
    if (error instanceof AdminUserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erro ao atualizar cargo customizado:", error);
    return NextResponse.json({ error: "Erro ao atualizar cargo customizado." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;

    const result = await deleteCustomRole(authUser, id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof AdminUserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erro ao excluir cargo customizado:", error);
    return NextResponse.json({ error: "Erro ao excluir cargo customizado." }, { status: 500 });
  }
}
