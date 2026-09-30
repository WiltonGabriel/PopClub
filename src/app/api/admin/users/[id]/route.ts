import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, hashPassword } from "@/lib/auth";
import { cleanCpf, validateCpf } from "@/lib/cpf";
import { Role } from "@prisma/client";
import { isUserAdmin } from "@/lib/permissions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !isUserAdmin(authUser)) {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const {
      role,
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

    // 1. Verificação de Alteração de Cargo (Role)
    if (role !== undefined) {
      const normalizedRole = String(role).toUpperCase();
      if (!["ADMIN", "EDITOR", "CLIENT"].includes(normalizedRole)) {
        return NextResponse.json({ error: "Cargo informado inválido." }, { status: 400 });
      }

      // Trava: Administrador não pode se auto-rebaixar
      if (authUser.id === targetUser.id && normalizedRole !== "ADMIN") {
        return NextResponse.json(
          { error: "Você não pode alterar seu próprio cargo de Administrador." },
          { status: 400 }
        );
      }

      // Trava: O sistema nunca pode ter zero administradores ativos
      if (targetUser.role === Role.ADMIN && normalizedRole !== "ADMIN") {
        const activeAdminsCount = await prisma.user.count({
          where: {
            role: Role.ADMIN,
            isActive: true,
            isBlocked: false,
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

      dataToUpdate.role = normalizedRole as Role;
      shouldInvalidateSession = true;
    }

    // 2. Verificação de Permissões
    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return NextResponse.json({ error: "Permissões devem ser uma lista." }, { status: 400 });
      }
      dataToUpdate.permissions = permissions.filter((p: unknown) => typeof p === "string");
      shouldInvalidateSession = true;
    }

    // 3. Reset de Senha
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve possuir no mínimo 6 caracteres." },
          { status: 400 }
        );
      }
      dataToUpdate.passwordHash = await hashPassword(password);
      shouldInvalidateSession = true;
    }

    // 4. Bloqueio / Desbloqueio
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

    // 5. Atualização de Dados Cadastrais
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
    if (!authUser || !isUserAdmin(authUser)) {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
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
