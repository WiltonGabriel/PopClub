import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { isUserAdmin } from "@/lib/permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!isUserAdmin(authUser)) {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID de usuário inválido." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        cpf: true,
        email: true,
        username: true,
        phone: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        permissions: true,
        isRegistered: true,
        isActive: true,
        isBlocked: true,
        blockReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    // Buscar pedidos associados a este usuário
    const orders = await prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Cálculos de métricas do dossiê
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === "completed").length;
    const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;

    // Faturamento e ticket médio considerando pedidos não-cancelados
    const validOrders = orders.filter((o) => o.status !== "cancelled");
    const totalSpent = validOrders.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
    const averageTicket = validOrders.length > 0 ? totalSpent / validOrders.length : 0;

    const firstOrderAt = orders.length > 0 ? orders[orders.length - 1].createdAt : null;
    const lastOrderAt = orders.length > 0 ? orders[0].createdAt : null;

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      status: order.status,
      subtotal: Number(order.subtotal || 0),
      discountAmount: Number(order.discountAmount || 0),
      deliveryFee: Number(order.deliveryFee || 0),
      totalAmount: Number(order.totalAmount || 0),
      paymentMethodType: order.paymentMethodType,
      deliveryStreet: order.deliveryStreet,
      deliveryNumber: order.deliveryNumber,
      deliveryNeighborhood: order.deliveryNeighborhood,
      couponCode: order.couponCode,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || "Produto",
        quantity: item.quantity,
        priceAtTime: Number(item.priceAtTime || 0),
        selectedAddons: item.selectedAddons,
      })),
    }));

    return NextResponse.json({
      user: targetUser,
      metrics: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalSpent,
        averageTicket,
        firstOrderAt,
        lastOrderAt,
      },
      orders: formattedOrders,
    });
  } catch (error: unknown) {
    console.error("Erro ao carregar histórico do cliente:", error);
    return NextResponse.json({ error: "Erro ao carregar histórico do cliente." }, { status: 500 });
  }
}
