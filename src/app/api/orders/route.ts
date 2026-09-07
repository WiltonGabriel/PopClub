import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    let whereClause: any = {};

    if (authUser?.role === "admin" && all) {
      whereClause = {}; // Admin visualiza todos os pedidos
    } else if (authUser?.id) {
      whereClause = { userId: authUser.id };
    } else {
      // Retorna vazio para usuário não autenticado
      return NextResponse.json([]);
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: { product: true },
        },
        user: {
          select: { fullName: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = orders.map((o) => ({
      id: o.id,
      user_id: o.userId,
      status: o.status,
      subtotal: Number(o.subtotal),
      discount_amount: Number(o.discountAmount),
      total_amount: Number(o.totalAmount),
      payment_method_type: o.paymentMethodType,
      payment_change_for: o.paymentChangeFor ? Number(o.paymentChangeFor) : null,
      delivery_address: {
        street: o.deliveryStreet,
        number: o.deliveryNumber,
        neighborhood: o.deliveryNeighborhood,
        city: o.deliveryCity,
        complement: o.deliveryComplement,
        reference: o.deliveryReference,
        zip: o.deliveryZip,
      },
      created_at: o.createdAt.toISOString(),
      updated_at: o.updatedAt.toISOString(),
      items: o.items.map((it) => ({
        id: it.id,
        order_id: it.orderId,
        product_id: it.productId,
        quantity: it.quantity,
        price_at_time: Number(it.priceAtTime),
        product: {
          id: it.product.id,
          name: it.product.name,
          description: it.product.description || "",
          price: Number(it.product.price),
          imageUrl: it.product.imageUrl || "",
        },
      })),
      user: o.user,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Erro ao listar pedidos:", error);
    return NextResponse.json({ error: "Erro ao buscar pedidos." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (authUser?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId e status são obrigatórios." }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Erro ao atualizar status do pedido:", error);
    return NextResponse.json({ error: "Erro ao atualizar pedido." }, { status: 500 });
  }
}
