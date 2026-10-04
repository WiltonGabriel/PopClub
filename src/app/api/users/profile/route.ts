import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, verifyPassword, hashPassword } from "@/lib/auth";

const DEFAULT_AVATAR = "/avatars/avatar-sorvete.svg";
const GUEST_DEFAULT_AVATAR = "/avatars/avatar-guest-user.svg";
const DEFAULT_ACCESSIBILITY = {
  fontSize: "normal",
  colorBlindMode: "none",
  highContrast: false,
  reduceMotion: false,
  visualAlerts: false,
  dyslexicFont: false,
};

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const profile = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        fullName: true,
        avatarUrl: true,
        accessibilitySettings: true,
        phone: true,
        isRegistered: true,
        notificationsEnabled: true,
        lastNameChangedAt: true,
        lastEmailChangedAt: true,
        lastPasswordChangedAt: true,
        createdAt: true,
      },
    });

    if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

    const defaultAvatar = profile.isRegistered === false ? GUEST_DEFAULT_AVATAR : DEFAULT_AVATAR;
    const avatar = profile.avatarUrl || defaultAvatar;
    const rawSettings = (profile.accessibilitySettings as Record<string, unknown>) || {};
    const accessibilitySettings = {
      fontSize: (rawSettings.fontSize as string) || DEFAULT_ACCESSIBILITY.fontSize,
      colorBlindMode: (rawSettings.colorBlindMode as string) || DEFAULT_ACCESSIBILITY.colorBlindMode,
      highContrast: Boolean(rawSettings.highContrast),
      reduceMotion: Boolean(rawSettings.reduceMotion),
      visualAlerts: Boolean(rawSettings.visualAlerts),
      dyslexicFont: Boolean(rawSettings.dyslexicFont),
    };

    const defaultPaymentMethod = (rawSettings.defaultPaymentMethod as string) || null;
    const defaultChangeFor = rawSettings.defaultChangeFor !== undefined ? (rawSettings.defaultChangeFor as number) : null;

    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      full_name: profile.fullName,
      avatar_url: avatar,
      avatar,
      accessibilitySettings,
      accessibility_settings: accessibilitySettings,
      default_payment_method: defaultPaymentMethod,
      defaultPaymentMethod,
      default_change_for: defaultChangeFor,
      defaultChangeFor,
      phone: profile.phone,
      isRegistered: Boolean(profile.isRegistered),
      notificationsEnabled: Boolean(profile.notificationsEnabled ?? true),
      notifications_enabled: Boolean(profile.notificationsEnabled ?? true),
      lastNameChangedAt: profile.lastNameChangedAt?.toISOString() || null,
      lastEmailChangedAt: profile.lastEmailChangedAt?.toISOString() || null,
      lastPasswordChangedAt: profile.lastPasswordChangedAt?.toISOString() || null,
      created_at: profile.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar perfil." }, { status: 500 });
  }
}

interface UpdateProfileBody {
  full_name?: string;
  fullName?: string;
  avatar?: string;
  avatar_url?: string;
  email?: string;
  current_password?: string;
  currentPassword?: string;
  new_password?: string;
  newPassword?: string;
  phone?: string;
  notificationsEnabled?: boolean;
  notifications_enabled?: boolean;
  accessibilitySettings?: Record<string, unknown>;
  accessibility_settings?: Record<string, unknown>;
  default_payment_method?: string;
  defaultPaymentMethod?: string;
  default_change_for?: string | number | null;
  defaultChangeFor?: string | number | null;
}

async function handleUpdateProfile(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    let body: UpdateProfileBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    // Gating de Avatar: Clientes em Acesso Rápido usam o avatar padrão neutro
    const requestedAvatar = body?.avatar_url || body?.avatar;
    if (requestedAvatar && requestedAvatar !== GUEST_DEFAULT_AVATAR && !authUser.isRegistered) {
      return NextResponse.json(
        {
          error: "Personalização de avatar disponível após completar o cadastro.",
          code: "AVATAR_REQUIRES_REGISTRATION",
        },
        { status: 403 }
      );
    }

    // Buscar configurações e usuário já existentes para fusão segura sem perda de dados
    const current = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        passwordHash: true,
        isRegistered: true,
        accessibilitySettings: true,
        lastNameChangedAt: true,
        lastEmailChangedAt: true,
        lastPasswordChangedAt: true,
      },
    });

    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
    const dataToUpdate: Prisma.UserUpdateInput = {};

    // 1. Alteração de Nome Completo
    const requestedName = body?.full_name ?? body?.fullName;
    if (requestedName !== undefined && requestedName.trim() !== (current?.fullName || "")) {
      if (current?.lastNameChangedAt) {
        const diff = Date.now() - new Date(current.lastNameChangedAt).getTime();
        if (diff < FOURTEEN_DAYS_MS) {
          const daysLeft = Math.ceil((FOURTEEN_DAYS_MS - diff) / (24 * 60 * 60 * 1000));
          return NextResponse.json(
            {
              error: `Dado alterado recentemente. Próxima alteração permitida em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}.`,
              code: "COOLDOWN_ACTIVE",
            },
            { status: 400 }
          );
        }
      }

      if (current?.isRegistered && current?.passwordHash) {
        const currentPassword = body?.current_password || body?.currentPassword;
        if (!currentPassword) {
          return NextResponse.json(
            { error: "Informe sua senha atual para alterar o nome.", code: "PASSWORD_REQUIRED" },
            { status: 400 }
          );
        }
        const isValid = await verifyPassword(currentPassword, current.passwordHash);
        if (!isValid) {
          return NextResponse.json({ error: "Senha atual incorreta.", code: "INVALID_PASSWORD" }, { status: 401 });
        }
      }

      dataToUpdate.fullName = requestedName.trim();
      dataToUpdate.lastNameChangedAt = new Date();
    }

    // 2. Alteração de E-mail
    if (body?.email !== undefined) {
      const nextEmail = body.email.trim().toLowerCase();
      if (nextEmail !== (current?.email || "").toLowerCase()) {
        if (current?.lastEmailChangedAt) {
          const diff = Date.now() - new Date(current.lastEmailChangedAt).getTime();
          if (diff < FOURTEEN_DAYS_MS) {
            const daysLeft = Math.ceil((FOURTEEN_DAYS_MS - diff) / (24 * 60 * 60 * 1000));
            return NextResponse.json(
              {
                error: `Dado alterado recentemente. Próxima alteração permitida em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}.`,
                code: "COOLDOWN_ACTIVE",
              },
              { status: 400 }
            );
          }
        }

        if (current?.isRegistered && current?.passwordHash) {
          const currentPassword = body?.current_password || body?.currentPassword;
          if (!currentPassword) {
            return NextResponse.json(
              { error: "Informe sua senha atual para alterar o e-mail.", code: "PASSWORD_REQUIRED" },
              { status: 400 }
            );
          }
          const isValid = await verifyPassword(currentPassword, current.passwordHash);
          if (!isValid) {
            return NextResponse.json({ error: "Senha atual incorreta.", code: "INVALID_PASSWORD" }, { status: 401 });
          }
        }

        const existing = await prisma.user.findFirst({
          where: { email: nextEmail, id: { not: authUser.id } },
        });
        if (existing) {
          return NextResponse.json(
            { error: "Este e-mail já está sendo utilizado por outra conta.", code: "EMAIL_IN_USE" },
            { status: 400 }
          );
        }

        dataToUpdate.email = nextEmail;
        dataToUpdate.lastEmailChangedAt = new Date();
      }
    }

    // 3. Redefinição de Senha
    const requestedNewPassword = body?.new_password || body?.newPassword;
    if (requestedNewPassword !== undefined && String(requestedNewPassword).trim().length > 0) {
      if (current?.lastPasswordChangedAt) {
        const diff = Date.now() - new Date(current.lastPasswordChangedAt).getTime();
        if (diff < FOURTEEN_DAYS_MS) {
          const daysLeft = Math.ceil((FOURTEEN_DAYS_MS - diff) / (24 * 60 * 60 * 1000));
          return NextResponse.json(
            {
              error: `Dado alterado recentemente. Próxima alteração permitida em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}.`,
              code: "COOLDOWN_ACTIVE",
            },
            { status: 400 }
          );
        }
      }

      if (current?.isRegistered && current?.passwordHash) {
        const currentPassword = body?.current_password || body?.currentPassword;
        if (!currentPassword) {
          return NextResponse.json(
            { error: "Informe sua senha atual para definir a nova senha.", code: "PASSWORD_REQUIRED" },
            { status: 400 }
          );
        }
        const isValid = await verifyPassword(currentPassword, current.passwordHash);
        if (!isValid) {
          return NextResponse.json({ error: "Senha atual incorreta.", code: "INVALID_PASSWORD" }, { status: 401 });
        }
      }

      const newPass = String(requestedNewPassword).trim();
      if (newPass.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve ter no mínimo 6 caracteres.", code: "PASSWORD_TOO_SHORT" },
          { status: 400 }
        );
      }

      dataToUpdate.passwordHash = await hashPassword(newPass);
      dataToUpdate.lastPasswordChangedAt = new Date();
    }

    if (body?.avatar_url !== undefined) dataToUpdate.avatarUrl = body.avatar_url;
    if (body?.avatar !== undefined) dataToUpdate.avatarUrl = body.avatar;
    if (body?.phone !== undefined) dataToUpdate.phone = body.phone;
    if (body?.notificationsEnabled !== undefined) dataToUpdate.notificationsEnabled = Boolean(body.notificationsEnabled);
    if (body?.notifications_enabled !== undefined) dataToUpdate.notificationsEnabled = Boolean(body.notifications_enabled);

    const currentSettings = (current?.accessibilitySettings as Record<string, unknown>) || {};
    let newSettings: Record<string, unknown> = { ...currentSettings };

    if (body?.accessibilitySettings !== undefined) {
      newSettings = { ...newSettings, ...body.accessibilitySettings };
    } else if (body?.accessibility_settings !== undefined) {
      newSettings = { ...newSettings, ...body.accessibility_settings };
    }

    if (body?.default_payment_method !== undefined) {
      newSettings.defaultPaymentMethod = body.default_payment_method;
    } else if (body?.defaultPaymentMethod !== undefined) {
      newSettings.defaultPaymentMethod = body.defaultPaymentMethod;
    }

    if (body?.default_change_for !== undefined) {
      newSettings.defaultChangeFor = body.default_change_for !== "" && body.default_change_for !== null ? Number(body.default_change_for) : null;
    } else if (body?.defaultChangeFor !== undefined) {
      newSettings.defaultChangeFor = body.defaultChangeFor !== "" && body.defaultChangeFor !== null ? Number(body.defaultChangeFor) : null;
    }

    dataToUpdate.accessibilitySettings = newSettings as Prisma.InputJsonValue;

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: dataToUpdate,
    });

    const defaultAvatar = updated.isRegistered === false ? GUEST_DEFAULT_AVATAR : DEFAULT_AVATAR;
    const avatar = updated.avatarUrl || defaultAvatar;
    const updatedRaw = (updated.accessibilitySettings as Record<string, unknown>) || {};
    const accessibilitySettings = {
      fontSize: (updatedRaw.fontSize as string) || DEFAULT_ACCESSIBILITY.fontSize,
      colorBlindMode: (updatedRaw.colorBlindMode as string) || DEFAULT_ACCESSIBILITY.colorBlindMode,
      highContrast: Boolean(updatedRaw.highContrast),
      reduceMotion: Boolean(updatedRaw.reduceMotion),
      visualAlerts: Boolean(updatedRaw.visualAlerts),
      dyslexicFont: Boolean(updatedRaw.dyslexicFont),
    };

    const defaultPaymentMethod = (updatedRaw.defaultPaymentMethod as string) || null;
    const defaultChangeFor = updatedRaw.defaultChangeFor !== undefined ? (updatedRaw.defaultChangeFor as number) : null;

    return NextResponse.json({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      full_name: updated.fullName,
      avatar_url: avatar,
      avatar,
      accessibilitySettings,
      accessibility_settings: accessibilitySettings,
      default_payment_method: defaultPaymentMethod,
      defaultPaymentMethod,
      default_change_for: defaultChangeFor,
      defaultChangeFor,
      phone: updated.phone,
      isRegistered: Boolean(updated.isRegistered),
      notificationsEnabled: Boolean(updated.notificationsEnabled ?? true),
      notifications_enabled: Boolean(updated.notificationsEnabled ?? true),
      lastNameChangedAt: updated.lastNameChangedAt?.toISOString() || null,
      lastEmailChangedAt: updated.lastEmailChangedAt?.toISOString() || null,
      lastPasswordChangedAt: updated.lastPasswordChangedAt?.toISOString() || null,
      created_at: updated.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar perfil." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return handleUpdateProfile(request);
}

export async function PATCH(request: Request) {
  return handleUpdateProfile(request);
}
