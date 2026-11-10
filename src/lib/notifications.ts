/**
 * Utilitário de Notificações Nativas do Navegador (Web Notification API)
 * Suporta Web Notifications convencionais e Service Worker para PWA/Mobile em segundo plano,
 * além de feedback sonoro (Ding) e toasts in-app com deduplicação de transições de status.
 */
import { playDingSound } from "./sound";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn("Erro ao solicitar permissão de notificação:", err);
    return Notification.permission;
  }
}

export async function sendWebNotification(
  title: string,
  options?: NotificationOptions & { playSound?: boolean }
): Promise<boolean> {
  if (options?.playSound) {
    playDingSound();
  }

  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const defaultOptions: NotificationOptions = {
    icon: "/icon.png",
    badge: "/icon.png",
    dir: "auto",
    lang: "pt-BR",
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    // 1. Tenta via Service Worker Registration (ideal para PWA e telas em segundo plano)
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && "showNotification" in registration) {
          await registration.showNotification(title, finalOptions);
          return true;
        }
      } catch {
        // Fallback para new Notification direto
      }
    }

    // 2. Fallback direto via Web Notification clássica
    const notification = new Notification(title, finalOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.warn("Falha ao disparar Web Notification:", err);
    return false;
  }
}

export interface OrderStatusNotificationParams {
  order: {
    id: string;
    status: string;
    cancellation_reason?: string | null;
    courier_name?: string | null;
  };
  previousStatus?: string | null;
  showToast?: (toast: {
    title: string;
    message: string;
    type: "info" | "success" | "error" | "warning";
    duration?: number;
  }) => void;
}

// Cache de transições já notificadas para evitar disparos duplicados entre SSE, polling e abas
const notifiedTransitions = new Set<string>();

/**
 * Dispara notificação imediata no navegador (Web Notification + Ding sonoro + Toast in-app)
 * sempre que o status do pedido mudar, garantindo deduplicação estrita.
 */
export function notifyOrderStatusChange({
  order,
  previousStatus,
  showToast,
}: OrderStatusNotificationParams): boolean {
  if (!order || !order.id || !order.status) return false;

  // Se o status anterior for idêntico ao atual, não há transição a notificar
  if (previousStatus && previousStatus === order.status) {
    return false;
  }

  const transitionKey = `${order.id}:${order.status}`;
  if (notifiedTransitions.has(transitionKey)) {
    return false;
  }
  notifiedTransitions.add(transitionKey);

  // Evita crescimento ilimitado de memória mantendo apenas as últimas 50 transições
  if (notifiedTransitions.size > 50) {
    const firstKey = notifiedTransitions.values().next().value;
    if (firstKey) notifiedTransitions.delete(firstKey);
  }

  const shortId = order.id.substring(0, 6);
  let title = `Atualização no Pedido #${shortId}`;
  let message = "Seu pedido teve uma nova atualização de status.";
  let toastType: "info" | "success" | "error" | "warning" = "info";
  let duration = 6000;

  switch (order.status) {
    case "pending":
      title = `Pedido #${shortId} Recebido! 📋`;
      message = "Recebemos seu pedido! A cozinha já vai iniciar o preparo.";
      duration = 6000;
      break;
    case "accepted":
      title = `Pedido #${shortId} Confirmado! ✅`;
      message = "Pedido confirmado na fila da esteira de preparo.";
      duration = 6000;
      break;
    case "preparing":
      title = `Pedido #${shortId} em Preparo! 🥣`;
      message = "Seu pedido começou a ser preparado com todo o carinho!";
      duration = 7000;
      break;
    case "ready":
      title = `Pedido #${shortId} Pronto p/ Saída! 📦`;
      message = "Seu pedido está embalado e pronto para envio ou retirada!";
      duration = 7000;
      break;
    case "delivering":
      title = `Pedido #${shortId} Saiu para Entrega! 🛵`;
      message = order.courier_name
        ? `Seu pedido saiu para entrega com ${order.courier_name}! Fique atento.`
        : "O motoboy está a caminho do seu endereço com seu pedido.";
      duration = 9000;
      break;
    case "completed":
      title = `Pedido #${shortId} Entregue! 🎉`;
      message = "Pedido entregue com sucesso! Esperamos que aproveite. Bom apetite!";
      toastType = "success";
      duration = 8000;
      break;
    case "cancelled":
      title = `Pedido #${shortId} Cancelado ❌`;
      message = `Motivo: ${order.cancellation_reason || "Informado pela loja"}`;
      toastType = "error";
      duration = 10000;
      break;
  }

  // 1. Feedback Sonoro imediato
  playDingSound();

  // 2. Notificação Nativa do Sistema Operacional / Navegador (se concedida)
  sendWebNotification(title, {
    body: message,
    icon: "/icon.png",
    tag: `popclub-order-${order.id}`,
  });

  // 3. Toast Visual in-app com detalhes enriquecidos (ex: nome do motoboy)
  if (showToast) {
    showToast({
      title,
      message,
      type: toastType,
      duration,
    });
  }

  return true;
}
