import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/apiResponse";
import { hasPermission } from "@/lib/permissions";

const INITIAL_PRESET_COURIERS = [
  {
    name: "Carlos Silva (Motoboy 01)",
    phone: "(65) 99234-5678",
    vehicle: "Honda CG Fan 160",
    plate: "QBB-1234",
    pixKey: "65992345678",
    status: "available",
  },
  {
    name: "Marcos Vinícius (Motoboy 02)",
    phone: "(65) 99876-5432",
    vehicle: "Yamaha Fazer 250",
    plate: "RAX-5678",
    pixKey: "marcos.motoboy@email.com",
    status: "available",
  },
  {
    name: "Lucas Ferreira (Motoboy 03)",
    phone: "(65) 99111-2233",
    vehicle: "Honda Titan 150",
    plate: "NTZ-9012",
    pixKey: "65991112233",
    status: "off_duty",
  },
];

export async function GET() {
  try {
    let couriers = await prisma.courier.findMany({
      where: { isActive: true },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    // Auto-seed inicial se tabela estiver vazia
    if (couriers.length === 0) {
      for (const preset of INITIAL_PRESET_COURIERS) {
        await prisma.courier.create({
          data: {
            ...preset,
            isActive: true,
          },
        });
      }
      couriers = await prisma.courier.findMany({
        where: { isActive: true },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      });
    }

    return apiSuccess(couriers);
  } catch (error: unknown) {
    return handleApiError(error, "GET /api/couriers", "Erro ao listar entregadores.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "settings_manage") && !hasPermission(user, "ORDERS_KANBAN")) {
      return apiError("Acesso negado. Permissão para gerenciar logística/entregadores necessária.", 403, "FORBIDDEN");
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return apiError("Corpo da requisição inválido.", 400);
    }

    const { name, phone, vehicle, plate, pixKey, status } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return apiError("Nome do entregador é obrigatório.", 400, "VALIDATION_ERROR");
    }
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return apiError("Telefone WhatsApp com DDD é obrigatório.", 400, "VALIDATION_ERROR");
    }

    const courier = await prisma.courier.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        vehicle: typeof vehicle === "string" && vehicle.trim() ? vehicle.trim() : "Moto",
        plate: typeof plate === "string" && plate.trim() ? plate.trim().toUpperCase() : null,
        pixKey: typeof pixKey === "string" && pixKey.trim() ? pixKey.trim() : null,
        status: status === "in_transit" || status === "off_duty" ? (status as string) : "available",
        isActive: true,
      },
    });

    return apiSuccess(courier);
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/couriers", "Erro ao cadastrar entregador.");
  }
}
