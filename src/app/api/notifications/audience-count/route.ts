import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getTargetClients } from "../helpers";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience") || "ALL";
    const rawLoyaltyIds = searchParams.get("loyaltyBadgeIds");
    const loyaltyBadgeIds = rawLoyaltyIds ? rawLoyaltyIds.split(",").filter(Boolean) : undefined;

    const clients = await getTargetClients(audience, loyaltyBadgeIds);
    return NextResponse.json({
      audience,
      count: clients.length,
    });
  } catch (error: any) {
    console.error("Erro ao calcular audiência de notificações:", error);
    return NextResponse.json({ error: "Erro ao obter contagem de clientes." }, { status: 500 });
  }
}
