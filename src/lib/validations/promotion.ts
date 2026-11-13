import { z } from "zod";

const optionalNullableInt = z.preprocess((val) => {
  if (val === "" || val === undefined || val === null) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : val;
}, z.number().int().min(0).nullable().optional());

const optionalNullableString = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === null) return null;
  const str = String(val).trim();
  return str.length > 0 ? str : null;
}, z.string().nullable().optional());

export const createPromotionSchema = z.object({
  title: z.string().trim().min(1, "Título da promoção é obrigatório.").max(120),
  badge: z.string().trim().max(40).optional().default("PROMO"),
  description: optionalNullableString,
  bannerImageUrl: optionalNullableString,
  gradientStart: z.string().trim().max(60).optional().default("#9306CF"),
  gradientEnd: z.string().trim().max(60).optional().default("#881BAA"),
  discountType: z.enum(["percentage", "fixed"]).optional().default("percentage"),
  discountValue: z.coerce.number().min(0, "Valor do desconto não pode ser negativo."),
  isActive: z.boolean().optional().default(true),
  startsAt: z.union([z.string(), z.date()]).nullable().optional(),
  expiresAt: z.union([z.string(), z.date()]).nullable().optional(),
  showDuration: z.boolean().optional().default(false),
  durationDisplay: z.array(z.string()).optional().default([]),
  productId: z.string().trim().min(1, "Produto alvo da promoção é obrigatório."),
  autoBanner: z.boolean().optional().default(false),
  showScarcity: z.boolean().optional().default(false),
  scarcityUnits: optionalNullableInt,
  scarcityType: z.enum(["strategic", "real"]).optional().default("strategic"),
  scarcityInitial: optionalNullableInt,
  scarcitySold: z.coerce.number().int().min(0).optional().default(0),
  showProgressBar: z.boolean().optional().default(false),
  urgencyType: z.enum(["date", "day", "session"]).optional().default("date"),
  sessionMinutes: optionalNullableInt,
});

export const updatePromotionSchema = createPromotionSchema.partial();

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
