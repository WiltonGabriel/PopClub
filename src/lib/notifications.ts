/**
 * Utilitário de Notificações Nativas do Navegador (Web Notification API)
 * Suporta Web Notifications convencionais e Service Worker para PWA/Mobile em segundo plano.
 */

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
