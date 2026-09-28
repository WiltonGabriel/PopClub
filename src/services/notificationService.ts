export interface AppNotificationCoupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  oncePerUser?: boolean;
  expiresAt: string | null;
  isActive: boolean;
}

export interface AppNotification {
  id: string;
  notificationId: string;
  title: string;
  message: string;
  type: "BROADCAST" | "TARGETED" | "COUPON";
  targetAudience?: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  coupon?: AppNotificationCoupon | null;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
  notificationsEnabled: boolean;
}

export interface NotificationTemplateItem {
  id: string;
  title: string;
  message: string;
  category: string;
  couponId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface DispatchNotificationInput {
  title: string;
  message: string;
  targetAudience: string;
  loyaltyBadgeIds?: string[];
  couponId?: string | null;
  type?: "BROADCAST" | "TARGETED" | "COUPON";
}

export const notificationService = {
  async getNotifications(): Promise<NotificationsResponse> {
    const res = await fetch("/api/notifications", {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) {
      return { notifications: [], unreadCount: 0, notificationsEnabled: true };
    }
    return await res.json();
  },

  async markAsRead(id: string): Promise<boolean> {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
    });
    return res.ok;
  },

  async markAllAsRead(): Promise<boolean> {
    const res = await fetch("/api/notifications/read-all", {
      method: "PATCH",
    });
    return res.ok;
  },

  async getAudienceCount(audience: string, loyaltyBadgeIds?: string[]): Promise<number> {
    let url = `/api/notifications/audience-count?audience=${encodeURIComponent(audience)}`;
    if (loyaltyBadgeIds && loyaltyBadgeIds.length > 0) {
      url += `&loyaltyBadgeIds=${encodeURIComponent(loyaltyBadgeIds.join(","))}`;
    }
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data.count) || 0;
  },

  async dispatchNotification(input: DispatchNotificationInput): Promise<{ success: boolean; recipientsCount: number; message: string }> {
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao disparar notificação.");
    }
    return data;
  },

  async getTemplates(): Promise<NotificationTemplateItem[]> {
    const res = await fetch("/api/notifications/templates");
    if (!res.ok) return [];
    return await res.json();
  },

  async createTemplate(data: { title: string; message: string; category?: string; couponId?: string | null }): Promise<NotificationTemplateItem> {
    const res = await fetch("/api/notifications/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Erro ao salvar modelo de mensagem.");
    }
    return json;
  },

  async updateTemplate(id: string, data: Partial<NotificationTemplateItem>): Promise<NotificationTemplateItem> {
    const res = await fetch(`/api/notifications/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Erro ao atualizar modelo de mensagem.");
    }
    return json;
  },

  async deleteTemplate(id: string): Promise<void> {
    const res = await fetch(`/api/notifications/templates/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || "Erro ao remover modelo.");
    }
  },

  async updatePreferences(notificationsEnabled: boolean): Promise<boolean> {
    const res = await fetch("/api/users/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationsEnabled }),
    });
    return res.ok;
  },
};
