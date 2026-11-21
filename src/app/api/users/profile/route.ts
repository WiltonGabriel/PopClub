import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, verifyPassword, hashPassword } from "@/lib/auth";
import { calculateAccountAgeMonths } from "@/services/loyaltyBadgeService";
import { avatarLimiter, getRateLimitKey, createRateLimitResponse } from "@/lib/rateLimit";
import {
  createEmailVerificationPayload,
  dispatchEmailVerification,
} from "@/services/emailVerificationService";
import {
  extractGoogleAvatarUrl,
  GoogleAuthError,
  validateAndPrepareUserPhone,
} from "@/services/googleAuthService";

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
        emailVerified: true,
        googleId: true,
        passwordHash: true,
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
        passwordUpdatedAt: true,
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
      emailVerified: Boolean(profile.emailVerified),
      hasGoogleLinked: Boolean(profile.googleId),
      hasPassword: Boolean(profile.passwordHash),
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
      passwordUpdatedAt: profile.passwordUpdatedAt?.toISOString() || profile.lastPasswordChangedAt?.toISOString() || null,
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

    // Buscar configurações e usuário já existentes para fusão segura sem perda de dados
    const current = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        emailVerified: true,
        googleId: true,
        avatarUrl: true,
        phone: true,
        passwordHash: true,
        isRegistered: true,
        createdAt: true,
        accessibilitySettings: true,
        lastNameChangedAt: true,
        lastEmailChangedAt: true,
        lastPasswordChangedAt: true,
        passwordUpdatedAt: true,
      },
    });

    const userGoogleAvatarUrl = extractGoogleAvatarUrl(current);

    // Gating e Desbloqueio de Avatar (por Meses de Conta e Compras Concluídas)
    const requestedAvatar = body?.avatar_url || body?.avatar;
    if (
      requestedAvatar &&
      requestedAvatar !== GUEST_DEFAULT_AVATAR &&
      requestedAvatar !== userGoogleAvatarUrl
    ) {
      if (!authUser.isRegistered) {
        return NextResponse.json(
          {
            error: "Personalização de avatar disponível após completar o cadastro.",
            code: "AVATAR_REQUIRES_REGISTRATION",
          },
          { status: 403 }
        );
      }

      const avatarLimitKey = getRateLimitKey(request, "avatar_update", authUser.id);
      const limitCheck = avatarLimiter.check(avatarLimitKey);
      if (!limitCheck.success) {
        return createRateLimitResponse(limitCheck, "Muitas alterações de avatar. Por favor, aguarde antes de tentar novamente.");
      }

      const preset = await prisma.avatarPreset.findFirst({
        where: { imageUrl: requestedAvatar, isActive: true },
      });

      if (preset && ((preset.minMonths ?? 0) > 0 || (preset.minOrders ?? 0) > 0)) {
        const minMonths = preset.minMonths ?? 0;
        const minOrders = preset.minOrders ?? 0;

        let userMonths = 0;
        if (current?.createdAt) {
          userMonths = calculateAccountAgeMonths(current.createdAt);
        }

        const completedOrders = await prisma.order.count({
          where: { userId: authUser.id, status: "completed" },
        });

        const isUnlocked =
          minMonths > 0 && minOrders > 0
            ? userMonths >= minMonths || completedOrders >= minOrders
            : minMonths > 0
            ? userMonths >= minMonths
            : completedOrders >= minOrders;

        if (!isUnlocked) {
          const reqDesc =
            minMonths > 0 && minOrders > 0
              ? `${minOrders} pedidos concluídos ou ${minMonths} meses de conta`
              : minMonths > 0
              ? `${minMonths} meses de conta`
              : `${minOrders} pedidos concluídos`;

          return NextResponse.json(
            {
              error: `O avatar "${preset.name}" está bloqueado. Requisito para desbloquear: ${reqDesc}.`,
              code: "AVATAR_LOCKED",
              minMonths,
              minOrders,
              userMonths,
              completedOrders,
            },
            { status: 403 }
          );
        }
      }
    }

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
    let pendingEmailVerification: { email: string; code: string } | null = null;
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

        const { code: verificationCode, expiresAt: verificationExpires } =
          createEmailVerificationPayload();

        dataToUpdate.email = nextEmail;
        dataToUpdate.lastEmailChangedAt = new Date();
        dataToUpdate.emailVerified = false;
        dataToUpdate.emailVerificationCode = verificationCode;
        dataToUpdate.emailVerificationExpires = verificationExpires;
        pendingEmailVerification = { email: nextEmail, code: verificationCode };
      }
    }

    // 3. Redefinição de Senha (Livre a qualquer momento mediante verificação da senha atual)
    const requestedNewPassword = body?.new_password || body?.newPassword;
    if (requestedNewPassword !== undefined && String(requestedNewPassword).trim().length > 0) {
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

      const now = new Date();
      dataToUpdate.passwordHash = await hashPassword(newPass);
      dataToUpdate.lastPasswordChangedAt = now;
      dataToUpdate.passwordUpdatedAt = now;
    }

    if (body?.avatar_url !== undefined) dataToUpdate.avatarUrl = body.avatar_url;
    if (body?.avatar !== undefined) dataToUpdate.avatarUrl = body.avatar;
    if (body?.phone !== undefined) {
      const nextPhoneRaw = String(body.phone || "").trim();
      const currentPhoneDigits = String(current?.phone || "").replace(/\D/g, "");
      const nextPhoneDigits = nextPhoneRaw.replace(/\D/g, "");
      if (nextPhoneDigits !== currentPhoneDigits) {
        try {
          const validatedPhone = await validateAndPrepareUserPhone(
            authUser.id,
            nextPhoneRaw
          );
          dataToUpdate.phone = validatedPhone;
        } catch (err: unknown) {
          if (err instanceof GoogleAuthError) {
            return NextResponse.json(
              { error: err.message, code: err.code },
              { status: err.code === "PHONE_IN_USE" ? 409 : 400 }
            );
          }
          throw err;
        }
      }
    }
    if (body?.notificationsEnabled !== undefined) dataToUpdate.notificationsEnabled = Boolean(body.notificationsEnabled);
    if (body?.notifications_enabled !== undefined) dataToUpdate.notificationsEnabled = Boolean(body.notifications_enabled);

    const currentSettings = (current?.accessibilitySettings as Record<string, unknown>) || {};
    let newSettings: Record<string, unknown> = { ...currentSettings };
    if (userGoogleAvatarUrl && !newSettings.googleAvatarUrl) {
      newSettings.googleAvatarUrl = userGoogleAvatarUrl;
    }

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

    let emailVerificationSent: boolean | undefined;
    if (pendingEmailVerification) {
      try {
        const sendResult = await dispatchEmailVerification({
          userId: updated.id,
          email: pendingEmailVerification.email,
          name: updated.fullName || updated.username,
          code: pendingEmailVerification.code,
          request,
        });
        emailVerificationSent = sendResult.success;
      } catch (emailErr: unknown) {
        console.error("[profile] Erro ao enviar confirmação para o novo e-mail:", emailErr);
        emailVerificationSent = false;
      }
    }

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
      emailVerified: Boolean(updated.emailVerified),
      hasGoogleLinked: Boolean(updated.googleId),
      hasPassword: Boolean(updated.passwordHash),
      ...(emailVerificationSent !== undefined ? { emailVerificationSent } : {}),
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
      passwordUpdatedAt: updated.passwordUpdatedAt?.toISOString() || updated.lastPasswordChangedAt?.toISOString() || null,
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
