import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { serverOrderEventManager } from "@/lib/serverOrderEvents";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const authUser = await getAuthUser(request);
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId")?.trim();
  const guestOrderIdsParam = searchParams.get("guestOrderIds")?.trim();
  const guestOrderIds = guestOrderIdsParam
    ? guestOrderIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Mensagem de handshake SSE
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: Date.now() })}\n\n`)
      );

      // 2. Inscrição no canal de eventos em tempo real
      const hasStaffOrderAccess =
        hasPermission(authUser, "ORDERS_KANBAN") ||
        hasPermission(authUser, "ORDERS_HISTORY") ||
        hasPermission(authUser, "metrics_view");

      unsubscribe = serverOrderEventManager.subscribe((event) => {
        const isMatch =
          Boolean(orderId && event.orderId === orderId) ||
          Boolean(authUser?.id && event.userId === authUser.id) ||
          Boolean(guestOrderIds.length > 0 && guestOrderIds.includes(event.orderId)) ||
          hasStaffOrderAccess;

        if (isMatch) {
          try {
            controller.enqueue(
              encoder.encode(`event: order\ndata: ${JSON.stringify(event)}\n\n`)
            );
          } catch {
            // Conexão já pode ter sido encerrada pelo cliente
          }
        }
      });

      // 3. Heartbeat periódico a cada 15s para evitar timeout de rede/proxy
      intervalId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (intervalId) clearInterval(intervalId);
        }
      }, 15000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
