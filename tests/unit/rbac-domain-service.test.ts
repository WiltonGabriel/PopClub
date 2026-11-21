import { describe, it, expect } from "vitest";
import {
  ALL_PERMISSIONS,
  PERMISSION_DEFINITIONS,
} from "@/lib/permissions";
import {
  PERMISSION_UI_GROUPS,
  ROLE_TEMPLATES,
  arePermissionSetsEqual,
  computePermissionDiff,
  describeAccessibleAreas,
  resolveEffectivePermissions,
} from "@/domain/services/RbacDomainService";
import {
  createStaffUserSchema,
  updateAdminUserSchema,
} from "@/lib/validations/adminUsers";

describe("RbacDomainService & Validações Administrativas", () => {
  it("resolve permissões efetivas corretamente para ADMIN, EDITOR modular, EDITOR com cargo e CLIENT", () => {
    expect(resolveEffectivePermissions({ role: "ADMIN", permissions: [] })).toHaveLength(
      ALL_PERMISSIONS.length
    );

    const editorWithRole = resolveEffectivePermissions({
      role: "EDITOR",
      permissions: ["ORDERS_KANBAN", "STOCK_CONTROL"],
      customRole: {
        permissions: ["STOCK_CONTROL", "coupons_manage"],
      },
    });
    expect(editorWithRole).toEqual(["ORDERS_KANBAN", "STOCK_CONTROL", "coupons_manage"]);

    expect(
      resolveEffectivePermissions({
        role: "CLIENT",
        permissions: ["ORDERS_KANBAN"],
      })
    ).toEqual([]);
  });

  it("calcula diff de permissões (added, removed, unchanged) ignorando ordem e duplicatas", () => {
    const diff = computePermissionDiff(
      ["ORDERS_KANBAN", "menu_manage", "ORDERS_KANBAN"],
      ["menu_manage", "STOCK_CONTROL", "metrics_view"]
    );

    expect(diff.added).toEqual(["STOCK_CONTROL", "metrics_view"]);
    expect(diff.removed).toEqual(["ORDERS_KANBAN"]);
    expect(diff.unchanged).toEqual(["menu_manage"]);

    expect(arePermissionSetsEqual(["a", "b"], ["b", "a"])).toBe(true);
    expect(arePermissionSetsEqual(["ORDERS_KANBAN", "menu_manage"], ["menu_manage", "ORDERS_KANBAN"])).toBe(true);
    expect(arePermissionSetsEqual(["ORDERS_KANBAN"], ["STOCK_CONTROL"])).toBe(false);
  });

  it("descreve corretamente as áreas acessíveis conforme papel e permissões", () => {
    const adminAreas = describeAccessibleAreas("ADMIN", []);
    expect(adminAreas.some((area) => area.id === "team_rbac")).toBe(true);
    expect(adminAreas.some((area) => area.id === "kanban")).toBe(true);

    const stockOnlyAreas = describeAccessibleAreas("EDITOR", ["STOCK_CONTROL"]);
    expect(stockOnlyAreas.map((a) => a.id)).toEqual(["stock"]);

    const metricsAndUsersAreas = describeAccessibleAreas("EDITOR", [
      "metrics_view",
      "users_manage",
    ]);
    expect(metricsAndUsersAreas.map((a) => a.id)).toEqual(["metrics", "clients_mod"]);
  });

  it("cobre todas as 13 permissões em PERMISSION_UI_GROUPS sem duplicatas nem omissões", () => {
    const groupedIds = PERMISSION_UI_GROUPS.flatMap((g) => g.permissions.map((p) => p.id));
    expect(groupedIds).toHaveLength(PERMISSION_DEFINITIONS.length);
    expect(new Set(groupedIds).size).toBe(ALL_PERMISSIONS.length);

    for (const perm of ALL_PERMISSIONS) {
      expect(groupedIds).toContain(perm);
    }

    for (const template of ROLE_TEMPLATES) {
      expect(template.permissions.length).toBeGreaterThan(0);
      for (const perm of template.permissions) {
        expect(ALL_PERMISSIONS).toContain(perm);
      }
    }
  });

  it("exige e-mail ou WhatsApp na criação de membro da equipe e preserva lista vazia explícita", () => {
    const missingContact = createStaffUserSchema.safeParse({
      fullName: "Operador Sem Contato",
      password: "Password123!",
      role: "EDITOR",
    });
    expect(missingContact.success).toBe(false);
    if (!missingContact.success) {
      expect(missingContact.error.issues[0]?.message).toContain("e-mail ou WhatsApp");
    }

    const emailOnly = createStaffUserSchema.safeParse({
      fullName: "Ana Paula",
      email: "ana@popclub.com",
      phone: "",
      password: "Password123!",
      role: "EDITOR",
      permissions: [],
    });
    expect(emailOnly.success).toBe(true);
    if (emailOnly.success) {
      expect(emailOnly.data.email).toBe("ana@popclub.com");
      expect(emailOnly.data.phone).toBeNull();
      expect(emailOnly.data.permissions).toEqual([]);
    }

    const phoneOnly = createStaffUserSchema.safeParse({
      fullName: "Carlos Motoboy",
      email: "",
      phone: "(65) 99988-7766",
      password: "Password123!",
      role: "EDITOR",
    });
    expect(phoneOnly.success).toBe(true);
    if (phoneOnly.success) {
      expect(phoneOnly.data.phone).toBe("65999887766");
      expect(phoneOnly.data.email).toBeNull();
      expect(phoneOnly.data.permissions).toBeUndefined();
    }
  });

  it("rejeita permissões inválidas e CPF inválido em create/update schemas", () => {
    const badPerms = createStaffUserSchema.safeParse({
      fullName: "Editor Teste",
      email: "editor@popclub.com",
      password: "Password123!",
      role: "EDITOR",
      permissions: ["INVALID_PERM"],
    });
    expect(badPerms.success).toBe(false);

    const badCpf = updateAdminUserSchema.safeParse({
      cpf: "111.111.111-11",
    });
    expect(badCpf.success).toBe(false);
  });
});
