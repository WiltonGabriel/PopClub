import { z } from "zod";

export const COURIER_STATUSES = ["available", "in_transit", "off_duty"] as const;
export type CourierStatus = (typeof COURIER_STATUSES)[number];

export const courierCreateSchema = z.object({
  name: z.string().trim().min(2, "Nome do entregador deve ter pelo menos 2 caracteres.").max(120),
  phone: z
    .string()
    .trim()
    .min(10, "Telefone WhatsApp com DDD inválido.")
    .max(25)
    .refine((val) => val.replace(/\D/g, "").length >= 10, {
      message: "Telefone WhatsApp deve conter ao menos 10 dígitos com DDD.",
    }),
  vehicle: z.string().trim().min(2).max(80).optional().default("Moto"),
  plate: z.string().trim().max(20).nullish(),
  pixKey: z.string().trim().max(120).nullish(),
  status: z.enum(COURIER_STATUSES).optional().default("available"),
});

export const courierUpdateSchema = z.object({
  name: z.string().trim().min(2, "Nome inválido.").max(120).optional(),
  phone: z
    .string()
    .trim()
    .min(10)
    .max(25)
    .refine((val) => val.replace(/\D/g, "").length >= 10, {
      message: "Telefone WhatsApp deve conter ao menos 10 dígitos com DDD.",
    })
    .optional(),
  vehicle: z.string().trim().min(2).max(80).optional(),
  plate: z.string().trim().max(20).nullish(),
  pixKey: z.string().trim().max(120).nullish(),
  status: z.enum(COURIER_STATUSES).optional(),
  isActive: z.boolean().optional(),
});

export const courierStatusSchema = z.object({
  status: z.enum(COURIER_STATUSES, {
    message: "Status inválido. Use 'available', 'in_transit' ou 'off_duty'.",
  }),
});

export interface CourierDispatchDto {
  id: string;
  name: string;
  phone: string;
  vehicle: string | null;
  plate: string | null;
  status: string;
  isActive: boolean;
}

/**
 * Projeção operacional segura para despacho no Kanban (ORDERS_KANBAN).
 * Omite dados sensíveis financeiros/pessoais (ex.: pixKey).
 */
export function toCourierDispatchDto(courier: {
  id: string;
  name: string;
  phone: string;
  vehicle: string | null;
  plate: string | null;
  status: string;
  isActive: boolean;
}): CourierDispatchDto {
  return {
    id: courier.id,
    name: courier.name,
    phone: courier.phone,
    vehicle: courier.vehicle,
    plate: courier.plate,
    status: courier.status,
    isActive: courier.isActive,
  };
}
