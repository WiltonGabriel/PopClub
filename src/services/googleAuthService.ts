import { randomInt } from "node:crypto";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidSafeAssetUrl } from "@/lib/urlValidation";

const DEFAULT_CLIENT_AVATAR = "/avatars/avatar-sorvete.svg";
const DEFAULT_GUEST_AVATAR = "/avatars/avatar-guest-user.svg";

export type GoogleAuthErrorCode =
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_DEACTIVATED"
  | "ACCOUNT_BLOCKED"
  | "STAFF_PASSWORD_REQUIRED"
  | "INVALID_PROFILE";

export class GoogleAuthError extends Error {
  readonly code: GoogleAuthErrorCode;

  constructor(code: GoogleAuthErrorCode, message: string) {
    super(message);
    this.name = "GoogleAuthError";
    this.code = code;
  }
}

export interface GoogleProfileInput {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export type GoogleResolvedUser = Prisma.UserGetPayload<{
  include: { customRole: { select: { permissions: true } } };
}>;

function isDefaultOrEmptyAvatar(avatarUrl: string | null | undefined): boolean {
  return (
    !avatarUrl ||
    avatarUrl === DEFAULT_CLIENT_AVATAR ||
    avatarUrl === DEFAULT_GUEST_AVATAR
  );
}

function getSafeGoogleAvatarUrl(picture: string | undefined): string | null {
  if (typeof picture !== "string") return null;
  const trimmed = picture.trim();
  return isValidSafeAssetUrl(trimmed, false) ? trimmed : null;
}

function isStaffRole(role: Role | string): boolean {
  const normalized = String(role).toUpperCase();
  return normalized === "ADMIN" || normalized === "EDITOR";
}

/**
 * Localiza um usuário existente por `googleId` ou e-mail verificado, aplica proteções
 * anti-takeover e status da conta, ou cria um novo cliente cadastrado via login social.
 */
export async function resolveOrCreateGoogleUser(
  profile: GoogleProfileInput
): Promise<GoogleResolvedUser> {
  const sub = typeof profile?.sub === "string" ? profile.sub.trim() : "";
  const cleanEmail = typeof profile?.email === "string" ? profile.email.trim().toLowerCase() : "";

  if (!sub || !cleanEmail || !cleanEmail.includes("@")) {
    throw new GoogleAuthError("INVALID_PROFILE", "Perfil Google inválido ou incompleto.");
  }

  if (profile.email_verified !== true) {
    throw new GoogleAuthError(
      "EMAIL_NOT_VERIFIED",
      "Seu e-mail no Google precisa estar verificado para continuar."
    );
  }

  const existingByGoogleId = await prisma.user.findFirst({
    where: { googleId: sub },
    include: { customRole: { select: { permissions: true } } },
  });

  const existing =
    existingByGoogleId ||
    (await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
      include: { customRole: { select: { permissions: true } } },
    }));

  const safePicture = getSafeGoogleAvatarUrl(profile.picture);
  const cleanProfileName =
    typeof profile.name === "string" && profile.name.trim()
      ? profile.name.trim().slice(0, 100)
      : null;

  if (existing) {
    if (!existing.isActive || existing.deletedAt) {
      throw new GoogleAuthError(
        "ACCOUNT_DEACTIVATED",
        "Esta conta foi desativada. Entre em contato com o suporte."
      );
    }

    if (existing.isBlocked) {
      throw new GoogleAuthError(
        "ACCOUNT_BLOCKED",
        existing.blockReason
          ? `Esta conta está bloqueada: ${existing.blockReason}`
          : "Esta conta está bloqueada administrativamente."
      );
    }

    // Impede account takeover de contas administrativas/operacionais por correspondência de e-mail
    if (isStaffRole(existing.role) && existing.googleId !== sub) {
      throw new GoogleAuthError(
        "STAFF_PASSWORD_REQUIRED",
        "Contas administrativas devem entrar usando senha."
      );
    }

    const updateData: Prisma.UserUpdateInput = {
      googleId: sub,
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpires: null,
      isRegistered: true,
    };

    if (!existing.email) {
      updateData.email = cleanEmail;
    }

    if (!existing.fullName?.trim() && cleanProfileName) {
      updateData.fullName = cleanProfileName;
    }

    if (isDefaultOrEmptyAvatar(existing.avatarUrl) && safePicture) {
      updateData.avatarUrl = safePicture;
    }

    return prisma.user.update({
      where: { id: existing.id },
      data: updateData,
      include: { customRole: { select: { permissions: true } } },
    });
  }

  const rawPrefix = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
  const baseUsername = rawPrefix.length >= 2 ? rawPrefix.slice(0, 30) : "cliente";

  const existingUsername = await prisma.user.findFirst({
    where: { username: baseUsername },
    select: { id: true },
  });

  const username = existingUsername
    ? `${baseUsername}_${randomInt(1000, 10000)}`
    : baseUsername;

  return prisma.user.create({
    data: {
      googleId: sub,
      email: cleanEmail,
      emailVerified: true,
      isRegistered: true,
      role: Role.CLIENT,
      username,
      fullName: cleanProfileName || baseUsername,
      avatarUrl: safePicture || DEFAULT_CLIENT_AVATAR,
    },
    include: { customRole: { select: { permissions: true } } },
  });
}
