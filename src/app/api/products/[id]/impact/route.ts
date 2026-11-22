import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getProductDependencyImpact } from "@/services/productDependencyService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage") && !hasPermission(user, "STOCK_CONTROL")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão de catálogo ou estoque necessária." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const impact = await getProductDependencyImpact(id);

    if (!impact) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(impact, { headers: NO_CACHE_HEADERS });
  } catch (error: unknown) {
    console.error("Erro ao calcular impacto do produto:", error);
    return NextResponse.json(
      { error: "Erro ao consultar dependências do produto." },
      { status: 500 }
    );
  }
}
