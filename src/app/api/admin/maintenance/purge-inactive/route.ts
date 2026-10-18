import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { adminOperationsLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";
import { ArchiveRetentionService, INACTIVE_RETENTION_DAYS } from "@/services/archiveRetentionService";

export async function POST(request: Request) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = adminOperationsLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(
        limitCheck,
        "Muitas operações administrativas em lote. Aguarde alguns instantes."
      );
    }

    const user = await getAuthUser(request);
    if (!user || (!hasPermission(user, "menu_manage") && user.role !== "admin")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão administrativa necessária para executar expurgo de dados." },
        { status: 403 }
      );
    }

    let cutoffDays = INACTIVE_RETENTION_DAYS;
    try {
      const body = (await request.json()) as { cutoffDays?: number };
      if (typeof body?.cutoffDays === "number" && body.cutoffDays >= 1) {
        cutoffDays = Math.min(365, Math.floor(body.cutoffDays));
      }
    } catch {
      // Usa o valor padrão se o corpo estiver vazio
    }

    const result = await ArchiveRetentionService.purgeAll(cutoffDays);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error("Erro na rotina de expurgo de dados inativos:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar expurgo de dados inativos." },
      { status: 500 }
    );
  }
}
