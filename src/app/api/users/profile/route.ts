import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const DEFAULT_AVATAR = "/avatars/avatar-sorvete.svg";
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
        notificationsEnabled: true,
        createdAt: true,
      },
    });

    if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

    const avatar = profile.avatarUrl || DEFAULT_AVATAR;
    const rawSettings = (profile.accessibilitySettings as Record<string, any>) || {};
    const accessibilitySettings = {
      fontSize: rawSettings.fontSize || DEFAULT_ACCESSIBILITY.fontSize,
      colorBlindMode: rawSettings.colorBlindMode || DEFAULT_ACCESSIBILITY.colorBlindMode,
      highContrast: Boolean(rawSettings.highContrast),
      reduceMotion: Boolean(rawSettings.reduceMotion),
      visualAlerts: Boolean(rawSettings.visualAlerts),
      dyslexicFont: Boolean(rawSettings.dyslexicFont),
    };

    const defaultPaymentMethod = rawSettings.defaultPaymentMethod || null;
    const defaultChangeFor = rawSettings.defaultChangeFor !== undefined ? rawSettings.defaultChangeFor : null;

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
      notificationsEnabled: Boolean(profile.notificationsEnabled ?? true),
      notifications_enabled: Boolean(profile.notificationsEnabled ?? true),
      created_at: profile.createdAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar perfil." }, { status: 500 });
  }
}

async function handleUpdateProfile(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (body?.full_name !== undefined) dataToUpdate.fullName = body.full_name;
    if (body?.avatar_url !== undefined) dataToUpdate.avatarUrl = body.avatar_url;
    if (body?.avatar !== undefined) dataToUpdate.avatarUrl = body.avatar;
    if (body?.phone !== undefined) dataToUpdate.phone = body.phone;
    if (body?.notificationsEnabled !== undefined) dataToUpdate.notificationsEnabled = Boolean(body.notificationsEnabled);
    if (body?.notifications_enabled !== undefined) dataToUpdate.notificationsEnabled = Boolean(body.notifications_enabled);

    // Buscar configurações já existentes para fusão segura sem perda de dados
    const current = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { accessibilitySettings: true },
    });
    const currentSettings = (current?.accessibilitySettings as Record<string, any>) || {};
    let newSettings: Record<string, any> = { ...currentSettings };

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

    dataToUpdate.accessibilitySettings = newSettings;

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: dataToUpdate,
    });

    const avatar = updated.avatarUrl || DEFAULT_AVATAR;
    const updatedRaw = (updated.accessibilitySettings as Record<string, any>) || {};
    const accessibilitySettings = {
      fontSize: updatedRaw.fontSize || DEFAULT_ACCESSIBILITY.fontSize,
      colorBlindMode: updatedRaw.colorBlindMode || DEFAULT_ACCESSIBILITY.colorBlindMode,
      highContrast: Boolean(updatedRaw.highContrast),
      reduceMotion: Boolean(updatedRaw.reduceMotion),
      visualAlerts: Boolean(updatedRaw.visualAlerts),
      dyslexicFont: Boolean(updatedRaw.dyslexicFont),
    };

    const defaultPaymentMethod = updatedRaw.defaultPaymentMethod || null;
    const defaultChangeFor = updatedRaw.defaultChangeFor !== undefined ? updatedRaw.defaultChangeFor : null;

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
      notificationsEnabled: Boolean(updated.notificationsEnabled ?? true),
      notifications_enabled: Boolean(updated.notificationsEnabled ?? true),
      created_at: updated.createdAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao atualizar perfil." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return handleUpdateProfile(request);
}

export async function PATCH(request: Request) {
  return handleUpdateProfile(request);
}
