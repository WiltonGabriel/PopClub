import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const includeArchived = searchParams.get("includeArchived") === "true";
    const paginated = searchParams.get("paginated") === "true";
    const statusFilter = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "15", 10)));

    let whereClause: any = {};

    if (authUser?.role === "admin" && all) {
      whereClause = {};
      if (!includeArchived) {
        whereClause.isArchived = false;
      }
    } else if (authUser?.id) {
      whereClause = { userId: authUser.id };
    } else {
      // Retorna vazio para usuário não autenticado
      return NextResponse.json(paginated ? { orders: [], total: 0, page: 1, limit, totalPages: 0, totalRevenue: 0, averageTicket: 0 } : []);
    }

    // Filtro por status
    if (statusFilter && statusFilter !== "all") {
      whereClause.status = statusFilter;
    }

    // Filtro por intervalo de datas
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    // Busca textual por ID, Nome, Usuário ou Telefone
    if (search) {
      whereClause.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { username: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search, mode: "insensitive" } } },
        { deliveryStreet: { contains: search, mode: "insensitive" } },
      ];
    }

    // Se paginação for solicitada
    if (paginated) {
      const [total, orders, allMatchingForMetrics] = await Promise.all([
        prisma.order.count({ where: whereClause }),
        prisma.order.findMany({
          where: whereClause,
          include: {
            items: {
              include: { product: true },
            },
            user: {
              select: { fullName: true, username: true, email: true, phone: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.findMany({
          where: whereClause,
          select: { totalAmount: true, status: true },
        }),
      ]);

      const validOrdersForRevenue = allMatchingForMetrics.filter((o) => o.status !== "cancelled");
      const totalRevenue = validOrdersForRevenue.reduce((acc, o) => acc + Number(o.totalAmount), 0);
      const averageTicket = validOrdersForRevenue.length > 0 ? totalRevenue / validOrdersForRevenue.length : 0;
      const totalPages = Math.ceil(total / limit) || 1;

      const formatted = orders.map((o) => ({
        id: o.id,
        user_id: o.userId,
        status: o.status,
        subtotal: Number(o.subtotal),
        discount_amount: Number(o.discountAmount),
        delivery_fee: Number(o.deliveryFee || 0),
        total_amount: Number(o.totalAmount),
        payment_method_type: o.paymentMethodType,
        payment_change_for: o.paymentChangeFor ? Number(o.paymentChangeFor) : null,
        shift_id: o.shiftId,
        is_archived: o.isArchived,
        delivery_address: {
          street: o.deliveryStreet,
          number: o.deliveryNumber,
          neighborhood: o.deliveryNeighborhood,
          city: o.deliveryCity,
          complement: o.deliveryComplement,
          reference: o.deliveryReference,
          zip: o.deliveryZip,
          latitude: o.deliveryLatitude,
          longitude: o.deliveryLongitude,
        },
        cancellation_reason: o.cancellationReason || null,
        cancelled_at: o.cancelledAt ? o.cancelledAt.toISOString() : null,
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

      return NextResponse.json({
        orders: formatted,
        total,
        page,
        limit,
        totalPages,
        totalRevenue,
        averageTicket,
      });
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: { product: true },
        },
        user: {
          select: { fullName: true, username: true, email: true, phone: true },
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
      delivery_fee: Number(o.deliveryFee || 0),
      total_amount: Number(o.totalAmount),
      payment_method_type: o.paymentMethodType,
      payment_change_for: o.paymentChangeFor ? Number(o.paymentChangeFor) : null,
      shift_id: o.shiftId,
      is_archived: o.isArchived,
      delivery_address: {
        street: o.deliveryStreet,
        number: o.deliveryNumber,
        neighborhood: o.deliveryNeighborhood,
        city: o.deliveryCity,
        complement: o.deliveryComplement,
        reference: o.deliveryReference,
        zip: o.deliveryZip,
        latitude: o.deliveryLatitude,
        longitude: o.deliveryLongitude,
      },
      cancellation_reason: o.cancellationReason || null,
      cancelled_at: o.cancelledAt ? o.cancelledAt.toISOString() : null,
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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const { orderId, status, cancellationReason } = body || {};

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId e status são obrigatórios." }, { status: 400 });
    }

    const dataToUpdate: any = { status };
    if (status === "cancelled") {
      dataToUpdate.cancellationReason = cancellationReason || "Cancelado pela administração";
      dataToUpdate.cancelledAt = new Date();
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: dataToUpdate,
      include: {
        items: { include: { product: true } },
        user: { select: { fullName: true, username: true, email: true, phone: true } },
      },
    });

    const formattedUpdated = {
      id: updated.id,
      user_id: updated.userId,
      status: updated.status,
      subtotal: Number(updated.subtotal),
      discount_amount: Number(updated.discountAmount),
      total_amount: Number(updated.totalAmount),
      payment_method_type: updated.paymentMethodType,
      payment_change_for: updated.paymentChangeFor ? Number(updated.paymentChangeFor) : null,
      delivery_address: {
        street: updated.deliveryStreet,
        number: updated.deliveryNumber,
        neighborhood: updated.deliveryNeighborhood,
        city: updated.deliveryCity,
        complement: updated.deliveryComplement,
        reference: updated.deliveryReference,
        zip: updated.deliveryZip,
      },
      cancellation_reason: updated.cancellationReason || null,
      cancelled_at: updated.cancelledAt ? updated.cancelledAt.toISOString() : null,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
      items: updated.items.map((it) => ({
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
      user: updated.user,
    };

    return NextResponse.json(formattedUpdated);
  } catch (error: any) {
    console.error("Erro ao atualizar status do pedido:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar pedido." }, { status: 500 });
  }
}
