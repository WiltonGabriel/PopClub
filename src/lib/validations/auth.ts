import { z } from "zod";

/**
 * Conjunto oficial de DDDs válidos no Brasil (Anatel)
 */
export const VALID_BRAZILIAN_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
  21, 22, 24,                         // RJ
  27, 28,                             // ES
  31, 32, 33, 34, 35, 37, 38,         // MG
  41, 42, 43, 44, 45, 46,             // PR
  47, 48, 49,                         // SC
  51, 53, 54, 55,                     // RS
  61,                                 // DF
  62, 64,                             // GO
  63,                                 // TO
  65, 66,                             // MT
  67,                                 // MS
  68,                                 // AC
  69,                                 // RO
  71, 73, 74, 75, 77,                 // BA
  79,                                 // SE
  81, 87,                             // PE
  82,                                 // AL
  83,                                 // PB
  84,                                 // RN
  85, 88,                             // CE
  86, 89,                             // PI
  91, 93, 94,                         // PA
  92, 97,                             // AM
  95,                                 // RR
  96,                                 // AP
  98, 99,                             // MA
]);

/**
 * Sanitiza e valida o nome completo:
 * - 3 a 80 caracteres
 * - Remove espaços extras nas pontas e colapsa múltiplos espaços internos
 * - Aceita caracteres alfabéticos (incluindo acentos e cedilha), apóstrofos e hífens
 * - Rejeita números e caracteres especiais soltos
 */
export const fullNameSchema = z
  .string()
  .transform((val) => (typeof val === "string" ? val.trim().replace(/\s+/g, " ") : ""))
  .refine((val) => val.length >= 3, {
    message: "O nome completo deve ter pelo menos 3 caracteres.",
  })
  .refine((val) => val.length <= 80, {
    message: "O nome completo deve ter no máximo 80 caracteres.",
  })
  .refine((val) => /^[a-zA-ZÀ-ÿ\s'-]+$/.test(val), {
    message: "O nome deve conter apenas letras e espaços válidos.",
  })
  .refine((val) => val.split(" ").length >= 1 && /[a-zA-ZÀ-ÿ]{2,}/.test(val), {
    message: "Por favor, informe um nome válido.",
  });

/**
 * Sanitiza e auto-corrige o número de telefone para o padrão brasileiro:
 * - Remove caracteres não numéricos (\D)
 * - DDI: se começar com 55 e tiver 12 ou 13 dígitos, remove o prefixo 55
 * - Caso 10 dígitos (DDD + 8 dígitos): auto-corrija inserindo o 9 logo após o DDD (normaliza para 11 dígitos)
 */
export function sanitizeAndNormalizePhone(val: string): string {
  if (typeof val !== "string") return "";
  let digits = val.replace(/\D/g, "");

  // Tratamento de DDI: Se começar com 55 e tiver 12 ou 13 dígitos, remove o prefixo 55
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.substring(2);
  }

  // Caso 10 dígitos (DDD + 8 dígitos): Auto-corrija inserindo o 9 logo após o DDD
  if (digits.length === 10) {
    const ddd = digits.substring(0, 2);
    const body = digits.substring(2);
    digits = `${ddd}9${body}`;
  }

  return digits;
}

/**
 * Sanitiza e valida o telefone/WhatsApp brasileiro:
 * - Extrai estritamente os dígitos numéricos
 * - DDI: se começar com 55 e tiver 12 ou 13 dígitos, remove o prefixo 55
 * - Caso 10 dígitos (DDD + 8 dígitos): auto-corrija inserindo o 9 logo após o DDD: DDD + "9" + 8_dígitos
 * - Caso menos de 10 dígitos (Faltou DDD): rejeita com mensagem orientando DDD
 * - Valida DDD brasileiro (11 a 99)
 * - 3º dígito obrigatoriamente '9' (celular padrão nacional)
 * - Rejeita números com todos os dígitos iguais (ex: 11111111111, 00000000000)
 * - Rejeita números com sequência repetida no corpo (ex: 11999999999)
 * - Saída no banco: SEMPRE persistido no formato normalizado de 11 dígitos (XX9XXXXXXXX)
 */
export const phoneSchema = z
  .string()
  .superRefine((val, ctx) => {
    if (typeof val !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Telefone deve ser uma string.",
      });
      return;
    }
    const cleanDigits = val.replace(/\D/g, "");
    let working = cleanDigits;
    if (working.startsWith("55") && (working.length === 12 || working.length === 13)) {
      working = working.substring(2);
    }
    // Caso menos de 10 dígitos (Faltou DDD)
    if (working.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, inclua o DDD com 2 dígitos antes do número (ex: 65, 11).",
      });
      return;
    }
    // Auto-correção de 10 dígitos para verificação das regras seguintes
    if (working.length === 10) {
      working = `${working.substring(0, 2)}9${working.substring(2)}`;
    }
    if (working.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O WhatsApp deve conter DDD + 9 dígitos (ex: 65999887766).",
      });
      return;
    }
    // Rejeita todos os 11 dígitos iguais: 00000000000, 11111111111, etc.
    if (/^(\d)\1{10}$/.test(working)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, informe um número de telefone real e válido.",
      });
      return;
    }
    // Rejeita celular com corpo de 9 dígitos todos iguais: ex 11999999999, 65988888888
    const body = working.substring(2);
    if (/^(\d)\1{8}$/.test(body)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, informe um número de telefone real e válido.",
      });
      return;
    }
    const ddd = parseInt(working.substring(0, 2), 10);
    if (!VALID_BRAZILIAN_DDDS.has(ddd)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DDD informado é inválido no Brasil.",
      });
      return;
    }
    if (working.charAt(2) !== "9") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O número de celular deve iniciar com o dígito 9 após o DDD.",
      });
      return;
    }
  })
  .transform((val) => sanitizeAndNormalizePhone(val));

/**
 * Validação de troco para pagamentos em dinheiro
 */
export function validateCashChange(
  paymentMethodType: string,
  changeFor: number | null | undefined,
  totalAmount: number
): { valid: boolean; error?: string; changeToReturn?: number } {
  if (paymentMethodType !== "dinheiro" && paymentMethodType !== "cash") {
    return { valid: true };
  }

  if (changeFor === null || changeFor === undefined) {
    return { valid: true, changeToReturn: 0 };
  }

  const numChangeFor = Number(changeFor);
  if (isNaN(numChangeFor) || numChangeFor <= 0) {
    return { valid: false, error: "O valor para troco deve ser um número válido." };
  }

  if (numChangeFor < totalAmount) {
    return {
      valid: false,
      error: "O valor para troco deve ser maior que o total do pedido.",
    };
  }

  const changeToReturn = Number((numChangeFor - totalAmount).toFixed(2));
  return { valid: true, changeToReturn };
}

/**
 * Validação estrita de e-mail para completar cadastro:
 * - Máximo 100 caracteres
 * - Minúsculo, trim
 * - Domínio com extensão válida
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(100, "O e-mail deve ter no máximo 100 caracteres.")
  .email("Formato de e-mail inválido.")
  .refine((val) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(val), {
    message: "O e-mail deve possuir um domínio válido (ex: .com ou .com.br).",
  });

/**
 * Validação de senha para completar cadastro:
 * - 6 a 32 caracteres
 */
export const passwordSchema = z
  .string()
  .min(6, "A senha deve ter no mínimo 6 caracteres.")
  .max(32, "A senha deve ter no máximo 32 caracteres.");

/**
 * Schema de entrada para Acesso Rápido
 */
export const fastAccessSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
});

/**
 * Schema para verificação de aparelho / confirmação de número
 */
export const verifyDeviceSchema = z.object({
  phone: phoneSchema,
  houseNumber: z.string().trim().optional(),
  addressId: z.string().optional(),
  newAddress: z
    .object({
      street: z.string().trim().min(1, "Rua é obrigatória"),
      number: z.string().trim().min(1, "Número é obrigatório"),
      neighborhood: z.string().trim().min(1, "Bairro é obrigatório"),
      city: z.string().trim().default("Local"),
      complement: z.string().trim().optional().nullable(),
      reference: z.string().trim().optional().nullable(),
      zip: z.string().trim().optional().nullable(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    })
    .optional(),
});

/**
 * Schema para completar cadastro
 */
export const completeProfileSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
