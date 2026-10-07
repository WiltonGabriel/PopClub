import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, hashPassword } from "@/lib/auth";
import { cleanCpf, validateCpf } from "@/lib/cpf";
import { Role } from "@prisma/client";
import { isUserAdmin, isUserEditor, hasPermission } from "@/lib/permissions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID de usuário inválido." }, { status: 400 });
    }

    const isSelf = authUser.id === id;
    const isAdmin = isUserAdmin(authUser);
    const hasUsersManage = isUserEditor(authUser) && hasPermission(authUser, "users_manage");

    if (!isSelf && !isAdmin && !hasUsersManage) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão users_manage necessária para editar outros usuários." },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        customRole: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const {
      role,
      customRoleId,
      permissions,
      password,
      isBlocked,
      blockReason,
      fullName,
      email,
      phone,
      cpf,
    } = body;

    const dataToUpdate: Record<string, unknown> = {};
    let shouldInvalidateSession = false;

    // =========================================================================
    // REGRA DE SEGURANÇA 1: IMUTABILIDADE DE CONTAS DE CLIENTES
    // Contas de clientes NUNCA podem ter seu cargo alterado para a equipe nem receber permissões.
    // =========================================================================
    if (targetUser.role === Role.CLIENT) {
      if (role !== undefined && role !== "CLIENT" && role !== Role.CLIENT) {
        return NextResponse.json(
          { error: "Contas de clientes são exclusivas para consumo e não podem ser convertidas em cargos operacionais." },
          { status: 400 }
        );
      }
      if (customRoleId !== undefined && customRoleId !== null) {
        return NextResponse.json(
          { error: "Contas de clientes são exclusivas para consumo e não podem ser convertidas em cargos operacionais." },
          { status: 400 }
        );
      }
      if (permissions !== undefined && Array.isArray(permissions) && permissions.length > 0) {
        return NextResponse.json(
          { error: "Contas de clientes são exclusivas para consumo e não podem receber permissões operacionais." },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // REGRA DE SEGURANÇA 2: IMUTABILIDADE DO CARGO DE ADMINISTRADOR
    // O cargo de Administrador nunca pode ser rebaixado ou alterado.
    // =========================================================================
    if (targetUser.role === Role.ADMIN) {
      if (role !== undefined && role !== "ADMIN" && role !== Role.ADMIN) {
        return NextResponse.json(
          { error: "O cargo de Administrador é soberano e imutável." },
          { status: 400 }
        );
      }
      if (customRoleId !== undefined && customRoleId !== null) {
        return NextResponse.json(
          { error: "O cargo de Administrador é soberano e não pode ser vinculado a cargos secundários." },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // 1. ALTERAÇÃO DE CARGO / VINCULAÇÃO A CARGO CUSTOMIZADO
    // Apenas Administradores podem alterar cargos.
    // =========================================================================
    if (role !== undefined || customRoleId !== undefined) {
      if (!isAdmin) {
        return NextResponse.json({ error: "Apenas administradores podem alterar cargos." }, { status: 403 });
      }

      // Se estiver promovendo alguém para ADMIN
      if (role !== undefined) {
        const normalizedRole = String(role).toUpperCase();
        if (normalizedRole === "ADMIN" && targetUser.role !== Role.ADMIN) {
          const activeAdminsCount = await prisma.user.count({
            where: {
              role: Role.ADMIN,
              isActive: true,
              deletedAt: null,
              id: { not: targetUser.id },
            },
          });
          if (activeAdminsCount >= 2) {
            return NextResponse.json(
              { error: "Limite atingido: O sistema permite no máximo 2 Administradores ativos." },
              { status: 400 }
            );
          }
          dataToUpdate.role = Role.ADMIN;
          dataToUpdate.customRoleId = null;
          shouldInvalidateSession = true;
        } else if (normalizedRole === "EDITOR") {
          dataToUpdate.role = Role.EDITOR;
          shouldInvalidateSession = true;
        }
      }

      // Se estiver alterando o cargo customizado
      if (customRoleId !== undefined) {
        if (customRoleId === null || customRoleId === "") {
          // Desvincula de cargo customizado e mantém como Editor padrão
          dataToUpdate.customRoleId = null;
          shouldInvalidateSession = true;
        } else {
          // Vinculando a um cargo customizado
          const customRole = await prisma.customRole.findUnique({
            where: { id: String(customRoleId) },
          });

          if (!customRole) {
            return NextResponse.json({ error: "Cargo personalizado selecionado não existe." }, { status: 404 });
          }

          // Verificar limite de lotação por cargo (máximo de 4 membros)
          const membersInRole = await prisma.user.count({
            where: {
              customRoleId: customRole.id,
              isActive: true,
              deletedAt: null,
              id: { not: targetUser.id },
            },
          });

          if (membersInRole >= 4) {
            return NextResponse.json(
              { error: `Limite de lotação atingido: O cargo "${customRole.name}" já possui o limite máximo de 4 membros vinculados.` },
              { status: 400 }
            );
          }

          dataToUpdate.role = Role.EDITOR;
          dataToUpdate.customRoleId = customRole.id;
          dataToUpdate.permissions = customRole.permissions;
          shouldInvalidateSession = true;
        }
      }
    }

    // =========================================================================
    // 2. VERIFICAÇÃO DE PERMISSÕES INDIVIDUAIS
    // =========================================================================
    if (permissions !== undefined) {
      if (!isAdmin) {
        return NextResponse.json({ error: "Apenas administradores podem alterar permissões." }, { status: 403 });
      }
      if (!Array.isArray(permissions)) {
        return NextResponse.json({ error: "Permissões devem ser uma lista." }, { status: 400 });
      }
      dataToUpdate.permissions = permissions.filter((p: unknown) => typeof p === "string");
      shouldInvalidateSession = true;
    }

    // =========================================================================
    // 3. RESET DE SENHA
    // =========================================================================
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve possuir no mínimo 6 caracteres." },
          { status: 400 }
        );
      }
      const now = new Date();
      dataToUpdate.passwordHash = await hashPassword(password);
      dataToUpdate.lastPasswordChangedAt = now;
      dataToUpdate.passwordUpdatedAt = now;
      shouldInvalidateSession = true;
    }

    // =========================================================================
    // 4. BLOQUEIO / DESBLOQUEIO
    // =========================================================================
    if (isBlocked !== undefined) {
      const blockedBool = Boolean(isBlocked);

      // Trava: Administrador não pode se auto-bloquear
      if (authUser.id === targetUser.id && blockedBool) {
        return NextResponse.json(
          { error: "Você não pode bloquear sua própria conta de Administrador." },
          { status: 400 }
        );
      }

      // Trava: O sistema nunca pode ter zero administradores ativos
      if (targetUser.role === Role.ADMIN && blockedBool) {
        const activeAdminsCount = await prisma.user.count({
          where: {
            role: Role.ADMIN,
            isActive: true,
            isBlocked: false,
            deletedAt: null,
            id: { not: targetUser.id },
          },
        });
        if (activeAdminsCount < 1) {
          return NextResponse.json(
            { error: "Operação não permitida. O sistema deve possuir pelo menos um Administrador ativo." },
            { status: 400 }
          );
        }
      }

      dataToUpdate.isBlocked = blockedBool;
      dataToUpdate.blockReason = blockedBool
        ? (typeof blockReason === "string" && blockReason.trim() ? blockReason.trim() : "Bloqueio administrativo.")
        : null;
      shouldInvalidateSession = true;
    }

    // =========================================================================
    // 5. ATUALIZAÇÃO DE DADOS CADASTRAIS
    // =========================================================================
    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return NextResponse.json({ error: "Nome completo não pode ser vazio." }, { status: 400 });
      }
      dataToUpdate.fullName = fullName.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
      if (normalizedEmail) {
        const existingEmail = await prisma.user.findFirst({
          where: { email: normalizedEmail, id: { not: id } },
        });
        if (existingEmail) {
          return NextResponse.json({ error: "Este e-mail já está em uso por outro usuário." }, { status: 409 });
        }
      }
      dataToUpdate.email = normalizedEmail;
    }

    if (phone !== undefined) {
      const cleanedPhone = phone ? String(phone).replace(/\D/g, "") : null;
      if (cleanedPhone) {
        const existingPhone = await prisma.user.findFirst({
          where: { phone: cleanedPhone, id: { not: id } },
        });
        if (existingPhone) {
          return NextResponse.json({ error: "Este telefone já está em uso por outro usuário." }, { status: 409 });
        }
      }
      dataToUpdate.phone = cleanedPhone;
    }

    if (cpf !== undefined) {
      const cleanedCpf = cpf ? cleanCpf(String(cpf)) : null;
      if (cleanedCpf) {
        if (!validateCpf(cleanedCpf)) {
          return NextResponse.json({ error: "CPF informado é inválido." }, { status: 400 });
        }
        const existingCpf = await prisma.user.findFirst({
          where: { cpf: cleanedCpf, id: { not: id } },
        });
        if (existingCpf) {
          return NextResponse.json({ error: "Este CPF já está em uso por outro usuário." }, { status: 409 });
        }
      }
      dataToUpdate.cpf = cleanedCpf;
    }

    // Se houve alteração de segurança, incrementa tokenVersion para derrubar JWTs
    if (shouldInvalidateSession) {
      dataToUpdate.tokenVersion = { increment: 1 };
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        cpf: true,
        email: true,
        username: true,
        phone: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        permissions: true,
        isRegistered: true,
        isActive: true,
        isBlocked: true,
        blockReason: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
        customRoleId: true,
        customRole: {
          select: {
            id: true,
            name: true,
            color: true,
            permissions: true,
          },
        },
        createdById: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
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
    const hasUsersManage = isUserAdmin(authUser) || (isUserEditor(authUser) && hasPermission(authUser, "users_manage"));
    if (!authUser || !hasUsersManage) {
      return NextResponse.json({ error: "Acesso negado. Permissão users_manage necessária." }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID de usuário inválido." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    // Trava: Administrador não pode se auto-excluir
    if (authUser.id === targetUser.id) {
      return NextResponse.json(
        { error: "Você não pode desativar ou excluir sua própria conta de Administrador." },
        { status: 400 }
      );
    }

    // Trava: O sistema nunca pode ter zero administradores ativos
    if (targetUser.role === Role.ADMIN) {
      const activeAdminsCount = await prisma.user.count({
        where: {
          role: Role.ADMIN,
          isActive: true,
          isBlocked: false,
          deletedAt: null,
          id: { not: targetUser.id },
        },
      });
      if (activeAdminsCount < 1) {
        return NextResponse.json(
          { error: "Operação não permitida. O sistema deve possuir pelo menos um Administrador ativo." },
          { status: 400 }
        );
      }
    }

    // Soft delete: preserva integridade histórica dos pedidos
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Usuário desativado com sucesso.",
    });
  } catch (error: unknown) {
    console.error("Erro ao desativar usuário:", error);
    return NextResponse.json({ error: "Erro ao desativar usuário." }, { status: 500 });
  }
}
