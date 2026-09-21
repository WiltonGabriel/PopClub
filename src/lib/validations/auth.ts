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
 * Sanitiza e valida o telefone/WhatsApp brasileiro:
 * - Extrai estritamente os dígitos numéricos
 * - Exige exatamente 11 dígitos
 * - DDD válido no Brasil (rejeita 00, 01, 10, etc.)
 * - 3º dígito obrigatoriamente '9' (celular padrão nacional)
 * - Rejeita números com todos os dígitos iguais (ex: 11111111111, 00000000000)
 * - Rejeita números com sequência repetida no corpo (ex: 11999999999)
 */
export const phoneSchema = z
  .string()
  .transform((val) => (typeof val === "string" ? val.replace(/\D/g, "") : ""))
  .refine((val) => val.length === 11, {
    message: "O WhatsApp deve conter DDD + 9 dígitos (ex: 65999887766).",
  })
  .refine(
    (val) => {
      const ddd = parseInt(val.substring(0, 2), 10);
      return VALID_BRAZILIAN_DDDS.has(ddd);
    },
    {
      message: "DDD informado é inválido no Brasil.",
    }
  )
  .refine((val) => val.charAt(2) === "9", {
    message: "O número de celular deve iniciar com o dígito 9 após o DDD.",
  })
  .refine(
    (val) => {
      // Rejeita todos os 11 dígitos iguais: 00000000000, 11111111111, etc.
      if (/^(\d)\1{10}$/.test(val)) return false;
      // Rejeita celular com corpo de 9 dígitos todos iguais: ex 11999999999, 65988888888
      const body = val.substring(2);
      if (/^(\d)\1{8}$/.test(body)) return false;
      return true;
    },
    {
      message: "Por favor, informe um número de telefone real e válido.",
    }
  );

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
