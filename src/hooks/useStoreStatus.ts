"use client";

import { useState, useEffect, useCallback } from "react";
import { StoreOperationalStatus, StoreStatusCode, BusinessHourDay } from "@/lib/storeSchedule";

export interface UseStoreStatusReturn {
  status: StoreStatusCode;
  statusLabel: string;
  isWithinSchedule: boolean;
  isConveyorOpen: boolean;
  canAcceptOrders: boolean;
  openingTime: string;
  closingTime: string;
  message: string;
  estimatedDeliveryTime: string;
  businessHours: BusinessHourDay[];
  loading: boolean;
  refresh: () => Promise<void>;
  toggleConveyor: (targetState?: boolean) => Promise<boolean>;
}

export function useStoreStatus(pollingIntervalMs: number = 20000): UseStoreStatusReturn {
  const [statusData, setStatusData] = useState<StoreOperationalStatus>({
    status: "OPERATIONAL_READY",
    statusLabel: "Loja Aberta (Recebendo Pedidos)",
    isWithinSchedule: true,
    isConveyorOpen: true,
    canAcceptOrders: true,
    openingTime: "13:00",
    closingTime: "23:30",
    currentDaySchedule: null,
    cuiabaTime: "13:00",
    cuiabaDay: "monday",
    message: "Loja aberta hoje até as 23:30.",
  });

  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState("30-50 min");
  const [businessHours, setBusinessHours] = useState<BusinessHourDay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/store/status", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setStatusData({
            status: data.status,
            statusLabel: data.statusLabel,
            isWithinSchedule: data.isWithinSchedule,
            isConveyorOpen: data.isConveyorOpen,
            canAcceptOrders: data.canAcceptOrders,
            openingTime: data.openingTime,
            closingTime: data.closingTime,
            currentDaySchedule: data.currentDaySchedule,
            cuiabaTime: data.cuiabaTime || data.serverTimeCuiaba || "13:00",
            cuiabaDay: data.cuiabaDay || "monday",
            message: data.message,
          });
        }
        if (data.estimatedDeliveryTime) {
          setEstimatedDeliveryTime(data.estimatedDeliveryTime);
        }
        if (Array.isArray(data.businessHours)) {
          setBusinessHours(data.businessHours);
        }
      }
    } catch (err) {
      console.warn("Falha ao verificar status da loja via hook:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleConveyor = useCallback(async (targetState?: boolean): Promise<boolean> => {
    const body = typeof targetState === "boolean" ? JSON.stringify({ isOpen: targetState }) : "{}";
    const res = await fetch("/api/admin/conveyor/toggle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await res.json().catch(() => ({} as { isOpen?: boolean; error?: string }));
    if (!res.ok) {
      throw new Error(data?.error || "Não foi possível alternar o status da esteira.");
    }
    await fetchStatus();
    return Boolean(data.isOpen);
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();

    if (pollingIntervalMs > 0) {
      const interval = setInterval(fetchStatus, pollingIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, pollingIntervalMs]);

  return {
    status: statusData.status,
    statusLabel: statusData.statusLabel,
    isWithinSchedule: statusData.isWithinSchedule,
    isConveyorOpen: statusData.isConveyorOpen,
    canAcceptOrders: statusData.canAcceptOrders,
    openingTime: statusData.openingTime,
    closingTime: statusData.closingTime,
    message: statusData.message,
    estimatedDeliveryTime,
    businessHours,
    loading,
    refresh: fetchStatus,
    toggleConveyor,
  };
}
