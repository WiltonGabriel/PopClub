import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/apiResponse";

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
    if (!user || user.role !== "admin") {
      return apiError("Acesso negado. Apenas administradores podem cadastrar entregadores.", 403, "FORBIDDEN");
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError("Corpo da requisição inválido.", 400);
    }

    const { name, phone, vehicle, plate, pixKey, status } = body || {};

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
        vehicle: vehicle?.trim() || "Moto",
        plate: plate?.trim()?.toUpperCase() || null,
        pixKey: pixKey?.trim() || null,
        status: status === "in_transit" || status === "off_duty" ? status : "available",
        isActive: true,
      },
    });

    return apiSuccess(courier);
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/couriers", "Erro ao cadastrar entregador.");
  }
}
