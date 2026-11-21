import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  AdminUserServiceError,
  deactivateAdminUser,
  updateAdminUser,
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

    const updatedUser = await updateAdminUser(authUser, id, body);
    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
    if (error instanceof AdminUserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json({ error: "Erro ao atualizar usuário." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;

    const result = await deactivateAdminUser(authUser, id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof AdminUserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erro ao desativar usuário:", error);
    return NextResponse.json({ error: "Erro ao desativar usuário." }, { status: 500 });
  }
}
