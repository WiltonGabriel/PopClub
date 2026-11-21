import { z } from "zod";
import { emailSchema, passwordSchema, phoneSchema } from "./auth";
import { cleanCpf, validateCpf } from "@/lib/cpf";
import { PermissionKey, validatePermissionsInput } from "@/lib/permissions";
import { RoleBadgeColor, VALID_ROLE_COLORS } from "@/domain/services/RbacDomainService";

const nullableOptionalEmailSchema = z
  .unknown()
  .transform((val, ctx): string | null | undefined => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Formato de e-mail inválido.",
      });
      return z.NEVER;
    }
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return null;
    const parsed = emailSchema.safeParse(trimmed);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: parsed.error.issues[0]?.message || "Formato de e-mail inválido.",
      });
      return z.NEVER;
    }
    return parsed.data;
  })
  .optional();

const nullableOptionalPhoneSchema = z
  .unknown()
  .transform((val, ctx): string | null | undefined => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Telefone deve ser uma string.",
      });
      return z.NEVER;
    }
    const trimmed = val.trim();
    if (!trimmed) return null;
    const parsed = phoneSchema.safeParse(trimmed);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: parsed.error.issues[0]?.message || "Telefone informado é inválido.",
      });
      return z.NEVER;
    }
    return parsed.data;
  })
  .optional();

const nullableOptionalCpfSchema = z
  .unknown()
  .transform((val, ctx): string | null | undefined => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF informado é inválido.",
      });
      return z.NEVER;
    }
    const trimmed = val.trim();
    if (!trimmed) return null;
    const digits = cleanCpf(trimmed);
    if (!validateCpf(digits)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF informado é inválido.",
      });
      return z.NEVER;
    }
    return digits;
  })
  .optional();

const nullableOptionalCustomRoleIdSchema = z
  .unknown()
  .transform((val, ctx): string | null | undefined => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ID de cargo personalizado inválido.",
      });
      return z.NEVER;
    }
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  .optional();

function parsePermissionsList(val: unknown, ctx: z.RefinementCtx): PermissionKey[] {
  if (!Array.isArray(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Permissões devem ser uma lista.",
    });
    return z.NEVER;
  }
  const { valid, invalid } = validatePermissionsInput(val);
  if (invalid.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Permissões inválidas informadas: ${invalid.join(", ")}`,
    });
    return z.NEVER;
  }
  return valid;
}

const permissionsArraySchema = z.unknown().transform(parsePermissionsList);
const createPermissionsArraySchema = z
  .unknown()
  .transform((val, ctx) => parsePermissionsList(val === undefined ? [] : val, ctx));

const requiredStaffFullNameSchema = z
  .unknown()
  .transform((val, ctx): string => {
    if (typeof val !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nome completo é obrigatório.",
      });
      return z.NEVER;
    }
    const normalized = val.trim().replace(/\s+/g, " ");
    if (normalized.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nome completo é obrigatório.",
      });
      return z.NEVER;
    }
    if (normalized.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O nome completo deve ter no mínimo 2 caracteres.",
      });
      return z.NEVER;
    }
    if (normalized.length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O nome completo deve ter no máximo 100 caracteres.",
      });
      return z.NEVER;
    }
    return normalized;
  });

const optionalStaffFullNameSchema = z
  .unknown()
  .transform((val, ctx): string | undefined => {
    if (val === undefined) return undefined;
    if (typeof val !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nome completo não pode ser vazio.",
      });
      return z.NEVER;
    }
    const normalized = val.trim().replace(/\s+/g, " ");
    if (normalized.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nome completo não pode ser vazio.",
      });
      return z.NEVER;
    }
    if (normalized.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O nome completo deve ter no mínimo 2 caracteres.",
      });
      return z.NEVER;
    }
    if (normalized.length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O nome completo deve ter no máximo 100 caracteres.",
      });
      return z.NEVER;
    }
    return normalized;
  })
  .optional();

const requiredStaffPasswordSchema = z
  .unknown()
  .transform((val, ctx): string => {
    if (typeof val !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A senha deve ter no mínimo 6 caracteres.",
      });
      return z.NEVER;
    }
    const parsed = passwordSchema.safeParse(val);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: parsed.error.issues[0]?.message || "A senha deve ter no mínimo 6 caracteres.",
      });
      return z.NEVER;
    }
    return parsed.data;
  });

const optionalUpdatePasswordSchema = z
  .unknown()
  .transform((val, ctx): string | undefined => {
    if (val === undefined) return undefined;
    if (typeof val !== "string" || val.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A nova senha deve possuir no mínimo 6 caracteres.",
      });
      return z.NEVER;
    }
    const parsed = passwordSchema.safeParse(val);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: parsed.error.issues[0]?.message || "Senha inválida.",
      });
      return z.NEVER;
    }
    return parsed.data;
  })
  .optional();

const staffRoleSchema = z
  .unknown()
  .transform((val, ctx): "ADMIN" | "EDITOR" => {
    if (val === undefined || val === null || val === "") {
      return "EDITOR";
    }
    const normalized = String(val).trim().toUpperCase();
    if (normalized !== "ADMIN" && normalized !== "EDITOR") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O cargo deve ser Administrador ou Editor/Customizado.",
      });
      return z.NEVER;
    }
    return normalized;
  });

const updateRoleSchema = z
  .unknown()
  .transform((val, ctx): "ADMIN" | "EDITOR" | "CLIENT" | undefined => {
    if (val === undefined) return undefined;
    const normalized = String(val).trim().toUpperCase();
    if (normalized !== "ADMIN" && normalized !== "EDITOR" && normalized !== "CLIENT") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O cargo informado é inválido.",
      });
      return z.NEVER;
    }
    return normalized;
  })
  .optional();

function isValidRoleColor(value: string): value is RoleBadgeColor {
  return (VALID_ROLE_COLORS as readonly string[]).includes(value);
}

const createRoleColorSchema = z
  .unknown()
  .transform((val, ctx): RoleBadgeColor => {
    if (val === undefined || val === null || val === "") {
      return "blue";
    }
    if (typeof val !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cor do cargo inválida.",
      });
      return z.NEVER;
    }
    const normalized = val.trim().toLowerCase();
    if (!isValidRoleColor(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cor do cargo inválida.",
      });
      return z.NEVER;
    }
    return normalized;
  });

const updateRoleColorSchema = z
  .unknown()
  .transform((val, ctx): RoleBadgeColor | undefined => {
    if (val === undefined) return undefined;
    if (typeof val !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cor do cargo inválida.",
      });
      return z.NEVER;
    }
    const normalized = val.trim().toLowerCase();
    if (!isValidRoleColor(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cor do cargo inválida.",
      });
      return z.NEVER;
    }
    return normalized;
  })
  .optional();

export const createStaffUserSchema = z
  .object({
    fullName: requiredStaffFullNameSchema,
    email: nullableOptionalEmailSchema,
    phone: nullableOptionalPhoneSchema,
    cpf: nullableOptionalCpfSchema,
    password: requiredStaffPasswordSchema,
    role: staffRoleSchema,
    customRoleId: nullableOptionalCustomRoleIdSchema,
    permissions: permissionsArraySchema.optional(),
  })
  .superRefine((data, ctx) => {
    const hasEmail = typeof data.email === "string" && data.email.length > 0;
    const hasPhone = typeof data.phone === "string" && data.phone.length > 0;
    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message:
          "Informe ao menos um e-mail ou WhatsApp para que o colaborador consiga fazer login.",
      });
    }
  });

export const updateAdminUserSchema = z.object({
  fullName: optionalStaffFullNameSchema,
  email: nullableOptionalEmailSchema,
  phone: nullableOptionalPhoneSchema,
  cpf: nullableOptionalCpfSchema,
  password: optionalUpdatePasswordSchema,
  role: updateRoleSchema,
  customRoleId: nullableOptionalCustomRoleIdSchema,
  permissions: permissionsArraySchema.optional(),
  isBlocked: z.boolean({ message: "Status de bloqueio inválido." }).optional(),
  blockReason: z
    .string({ message: "Motivo do bloqueio inválido." })
    .trim()
    .max(300, "O motivo do bloqueio deve ter no máximo 300 caracteres.")
    .nullable()
    .optional(),
});

export const createCustomRoleSchema = z.object({
  name: z
    .string({ message: "O nome do cargo é obrigatório." })
    .trim()
    .min(1, "O nome do cargo é obrigatório.")
    .max(60, "O nome do cargo deve ter no máximo 60 caracteres."),
  color: createRoleColorSchema,
  permissions: createPermissionsArraySchema,
});

export const updateCustomRoleSchema = z.object({
  name: z
    .string({ message: "O nome do cargo não pode ser vazio." })
    .trim()
    .min(1, "O nome do cargo não pode ser vazio.")
    .max(60, "O nome do cargo deve ter no máximo 60 caracteres.")
    .optional(),
  color: updateRoleColorSchema,
  permissions: permissionsArraySchema.optional(),
});

export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type CreateCustomRoleInput = z.infer<typeof createCustomRoleSchema>;
export type UpdateCustomRoleInput = z.infer<typeof updateCustomRoleSchema>;
