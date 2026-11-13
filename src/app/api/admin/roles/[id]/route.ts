import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { isUserAdmin, validatePermissionsInput } from "@/lib/permissions";
import { recordAdminAudit } from "@/services/auditLogService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !isUserAdmin(authUser)) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem editar cargos personalizados." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID de cargo inválido." }, { status: 400 });
    }

    const existingRole = await prisma.customRole.findUnique({
      where: { id },
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Cargo não encontrado." }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const { name, color, permissions } = body;
    const dataToUpdate: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "O nome do cargo não pode ser vazio." }, { status: 400 });
      }
      const trimmedName = name.trim();
      if (trimmedName !== existingRole.name) {
        const nameConflict = await prisma.customRole.findFirst({
          where: { name: trimmedName, id: { not: id } },
        });
        if (nameConflict) {
          return NextResponse.json(
            { error: `Já existe outro cargo com o nome "${trimmedName}".` },
            { status: 409 }
          );
        }
        dataToUpdate.name = trimmedName;
      }
    }

    if (color !== undefined) {
      const validColors = ["blue", "purple", "emerald", "amber", "rose", "cyan", "indigo", "orange"];
      if (typeof color === "string" && validColors.includes(color.toLowerCase())) {
        dataToUpdate.color = color.toLowerCase();
      }
    }

    let updateUsersPermissions = false;
    let newPermissions: string[] = [];
    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return NextResponse.json({ error: "Permissões devem ser uma lista." }, { status: 400 });
      }
      const { valid, invalid } = validatePermissionsInput(permissions);
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Permissões inválidas informadas: ${invalid.join(", ")}` },
          { status: 400 }
        );
      }
      newPermissions = valid;
      dataToUpdate.permissions = newPermissions;
      updateUsersPermissions = true;
    }

    const updatedRole = await prisma.customRole.update({
      where: { id },
      data: dataToUpdate,
      include: {
        _count: {
          select: {
            users: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    // Se as permissões do cargo foram alteradas, sincroniza com os usuários que possuem esse cargo
    if (updateUsersPermissions) {
      await prisma.user.updateMany({
        where: { customRoleId: id },
        data: { permissions: newPermissions },
      });
    }

    await recordAdminAudit({
      actor: { id: authUser.id, role: authUser.role },
      action: "UPDATE_CUSTOM_ROLE",
      resourceType: "custom_role",
      resourceId: updatedRole.id,
      summary: `Atualizou cargo personalizado "${updatedRole.name}".`,
      diffKeys: Object.keys(dataToUpdate),
      metadata: { roleName: updatedRole.name, permissionsCount: updatedRole.permissions.length },
    });

    return NextResponse.json(updatedRole);
  } catch (error: unknown) {
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
    if (!authUser || !isUserAdmin(authUser)) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem excluir cargos personalizados." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID de cargo inválido." }, { status: 400 });
    }

    const role = await prisma.customRole.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: "Cargo não encontrado." }, { status: 404 });
    }

    // Proteção contra Exclusão Órfã: Não permitir deletar se houver membros vinculados
    if (role._count.users > 0) {
      return NextResponse.json(
        {
          error: `Não é possível excluir o cargo "${role.name}" porque há ${role._count.users} membro(s) da equipe vinculado(s) a ele. Reatribua os membros para outro cargo antes de excluí-lo.`,
        },
        { status: 400 }
      );
    }

    await prisma.customRole.delete({
      where: { id },
    });

    await recordAdminAudit({
      actor: { id: authUser.id, role: authUser.role },
      action: "DELETE_CUSTOM_ROLE",
      resourceType: "custom_role",
      resourceId: id,
      summary: `Excluiu cargo personalizado "${role.name}".`,
      metadata: { roleName: role.name },
    });

    return NextResponse.json({
      success: true,
      message: `Cargo "${role.name}" excluído com sucesso.`,
    });
  } catch (error: unknown) {
    console.error("Erro ao excluir cargo customizado:", error);
    return NextResponse.json({ error: "Erro ao excluir cargo customizado." }, { status: 500 });
  }
}
