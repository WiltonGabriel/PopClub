import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getTargetClients, isValidTargetAudience } from "../helpers";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(user, "notifications_manage")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão notifications_manage necessária." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience") || "ALL";
    if (!isValidTargetAudience(audience)) {
      return NextResponse.json(
        { error: "Segmento de público inválido." },
        { status: 400 }
      );
    }

    const rawLoyaltyIds = searchParams.get("loyaltyBadgeIds");
    const loyaltyBadgeIds = rawLoyaltyIds ? rawLoyaltyIds.split(",").filter(Boolean) : undefined;

    const clients = await getTargetClients(audience, loyaltyBadgeIds);
    return NextResponse.json({
      audience,
      count: clients.length,
    });
  } catch (error: unknown) {
    console.error("Erro ao calcular audiência de notificações:", error);
    return NextResponse.json({ error: "Erro ao obter contagem de clientes." }, { status: 500 });
  }
}
