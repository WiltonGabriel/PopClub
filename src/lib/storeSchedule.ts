import { prisma } from "@/lib/prisma";

export const CUIABA_TIMEZONE = "America/Cuiaba";

export interface BusinessHourDay {
  day: string; // "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
  label: string;
  isOpen: boolean;
  openTime: string; // "HH:mm" (ex: "13:00")
  closeTime: string; // "HH:mm" (ex: "23:30")
}

export const DEFAULT_STORE_SCHEDULE: BusinessHourDay[] = [
  { day: "monday", label: "Segunda-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "tuesday", label: "Terça-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "wednesday", label: "Quarta-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "thursday", label: "Quinta-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "friday", label: "Sexta-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "saturday", label: "Sábado", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "sunday", label: "Domingo", isOpen: true, openTime: "14:00", closeTime: "23:00" },
];

export type StoreStatusCode = "OPERATIONAL_READY" | "CONVEYOR_PAUSED" | "STORE_CLOSED";

export interface StoreOperationalStatus {
  status: StoreStatusCode;
  statusLabel: string;
  isWithinSchedule: boolean;
  isConveyorOpen: boolean;
  canAcceptOrders: boolean;
  openingTime: string;
  closingTime: string;
  currentDaySchedule: BusinessHourDay | null;
  cuiabaTime: string; // "HH:mm"
  cuiabaDay: string; // "monday", etc.
  message: string;
}

/**
 * Retorna as informações decompostas da data/hora atual no fuso horário oficial de Cuiabá (America/Cuiaba).
 */
export function getCuiabaNow(date: Date = new Date()): {
  dayOfWeek: string;
  timeString: string;
  hours: number;
  minutes: number;
} {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: CUIABA_TIMEZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = dtf.formatToParts(date);
  let dayOfWeek = "";
  let hours = 0;
  let minutes = 0;

  for (const part of parts) {
    if (part.type === "weekday") {
      dayOfWeek = part.value.toLowerCase();
    } else if (part.type === "hour") {
      hours = parseInt(part.value, 10);
    } else if (part.type === "minute") {
      minutes = parseInt(part.value, 10);
    }
  }

  const timeString = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return { dayOfWeek, timeString, hours, minutes };
}

/**
 * Converte string "HH:mm" em total de minutos a partir da meia-noite (0 a 1439).
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

/**
 * Verifica se um determinado horário está dentro da janela de funcionamento.
 * Suporta intervalos diurnos (ex: 13:00 às 23:30) e intervalos que viram a noite (ex: 18:00 às 02:00).
 * Importante: O encerramento no minuto exato (ex: 23:30) é estrito (tempo atual < closeTime).
 */
export function isTimeWithinRange(currentTime: string, openTime: string, closeTime: string): boolean {
  const current = timeStringToMinutes(currentTime);
  const open = timeStringToMinutes(openTime);
  const close = timeStringToMinutes(closeTime);

  if (open === close) {
    return false;
  }

  if (close > open) {
    // Janela padrão no mesmo dia (ex: 13:00 às 23:30)
    // Aberto se current >= open e current < close. No minuto 23:30 já está fechado.
    return current >= open && current < close;
  } else {
    // Janela que cruza a meia-noite (ex: 18:00 às 02:00)
    return current >= open || current < close;
  }
}

/**
 * Avalia o status operacional da loja com base na grade de horários, status da esteira e horário atual.
 */
export function evaluateStoreSchedule(
  businessHours: BusinessHourDay[] | null | undefined,
  isConveyorOpen: boolean,
  currentDate: Date = new Date()
): StoreOperationalStatus {
  const scheduleList = Array.isArray(businessHours) && businessHours.length > 0
    ? businessHours
    : DEFAULT_STORE_SCHEDULE;

  const cuiaba = getCuiabaNow(currentDate);

  // Busca o dia de hoje
  const todaySchedule = scheduleList.find(
    (item) => item.day.toLowerCase() === cuiaba.dayOfWeek
  ) || null;

  const openingTime = todaySchedule?.openTime || "13:00";
  const closingTime = todaySchedule?.closeTime || "23:30";

  let isWithinSchedule = false;

  if (todaySchedule && todaySchedule.isOpen) {
    isWithinSchedule = isTimeWithinRange(cuiaba.timeString, todaySchedule.openTime, todaySchedule.closeTime);
  }

  // Se não estiver dentro do horário de hoje, verifica se o dia anterior teve virada de noite
  if (!isWithinSchedule) {
    const daysOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayIndex = daysOrder.indexOf(cuiaba.dayOfWeek);
    const yesterdayIndex = (todayIndex + 6) % 7;
    const yesterdayDay = daysOrder[yesterdayIndex];

    const yesterdaySchedule = scheduleList.find(
      (item) => item.day.toLowerCase() === yesterdayDay
    );

    if (yesterdaySchedule && yesterdaySchedule.isOpen) {
      const yOpen = timeStringToMinutes(yesterdaySchedule.openTime);
      const yClose = timeStringToMinutes(yesterdaySchedule.closeTime);
      // Se virou a noite (close < open) e agora é antes do fechamento de ontem
      if (yClose < yOpen && timeStringToMinutes(cuiaba.timeString) < yClose) {
        isWithinSchedule = true;
      }
    }
  }

  let status: StoreStatusCode;
  let statusLabel: string;
  let canAcceptOrders: boolean;
  let message: string;

  if (!isWithinSchedule) {
    status = "STORE_CLOSED";
    statusLabel = "Loja Fechada";
    canAcceptOrders = false;
    message = `Estamos fechados no momento. Hoje nosso horário de atendimento é das ${openingTime} às ${closingTime}. Você já pode ir escolhendo seus itens e montando sua sacola!`;
  } else if (!isConveyorOpen) {
    status = "CONVEYOR_PAUSED";
    statusLabel = "Preparando Cozinha (Aguardando Esteira)";
    canAcceptOrders = false;
    message = `Finalizando os preparativos da cozinha. Nossa equipe está organizando a esteira para atender você. Nosso horário hoje é das ${openingTime} às ${closingTime}. Em instantes o recebimento de pedidos estará liberado!`;
  } else {
    status = "OPERATIONAL_READY";
    statusLabel = "Loja Aberta (Recebendo Pedidos)";
    canAcceptOrders = true;
    message = `Loja aberta hoje até as ${closingTime}.`;
  }

  return {
    status,
    statusLabel,
    isWithinSchedule,
    isConveyorOpen,
    canAcceptOrders,
    openingTime,
    closingTime,
    currentDaySchedule: todaySchedule,
    cuiabaTime: cuiaba.timeString,
    cuiabaDay: cuiaba.dayOfWeek,
    message,
  };
}

/**
 * Consulta as configurações no Prisma e avalia o status operacional atual da loja.
 */
export async function getStoreOperationalStatus(customDate?: Date): Promise<StoreOperationalStatus> {
  let settings = null;
  try {
    settings = await prisma.storeSettings.findUnique({
      where: { id: "store_config" },
    });
  } catch (err) {
    console.warn("Aviso ao buscar storeSettings para status operacional:", err);
  }

  const isConveyorOpen = settings ? Boolean(settings.isOpen) : true;
  const businessHours = (settings?.businessHours as unknown as BusinessHourDay[]) || DEFAULT_STORE_SCHEDULE;

  return evaluateStoreSchedule(businessHours, isConveyorOpen, customDate);
}
