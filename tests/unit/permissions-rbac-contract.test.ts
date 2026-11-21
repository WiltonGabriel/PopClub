import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  PERMISSION_KEYS,
  PERMISSION_DEFINITIONS,
  ALL_PERMISSIONS,
  DEFAULT_EDITOR_PERMISSIONS,
  TAB_PERMISSION_MAP,
  hasPermission,
  isUserAdmin,
  isUserEditor,
  isValidPermissionKey,
  validatePermissionsInput,
} from "@/lib/permissions";
import { getAuthorizedAdminFallbackRoute } from "@/lib/adminNavigation";
import { isValidSafeAssetUrl } from "@/lib/urlValidation";
import { toCourierDispatchDto } from "@/services/courierDispatchProjection";

describe("Contrato RBAC, Permissões por Domínio, URLs e Projeção de Entregadores", () => {
  it("mantém 100% de consistência entre PERMISSION_KEYS, PERMISSION_DEFINITIONS e TAB_PERMISSION_MAP", () => {
    const keyValues = Object.values(PERMISSION_KEYS);
    expect(keyValues).toContain("logistics_manage");
    expect(keyValues).toContain("notifications_manage");
    expect(keyValues).toContain("loyalty_manage");
    expect(keyValues).toContain("storefront_edit");
    expect(DEFAULT_EDITOR_PERMISSIONS).not.toContain("storefront_edit");

    expect(ALL_PERMISSIONS).toHaveLength(keyValues.length);
    for (const key of keyValues) {
      expect(ALL_PERMISSIONS).toContain(key);
      expect(isValidPermissionKey(key)).toBe(true);
    }

    for (const def of PERMISSION_DEFINITIONS) {
      expect(ALL_PERMISSIONS).toContain(def.id);
      expect(def.label.length).toBeGreaterThan(2);
    }

    for (const perm of DEFAULT_EDITOR_PERMISSIONS) {
      expect(isValidPermissionKey(perm)).toBe(true);
    }

    for (const [, mappedPerm] of Object.entries(TAB_PERMISSION_MAP)) {
      expect(isValidPermissionKey(mappedPerm)).toBe(true);
    }
    expect(TAB_PERMISSION_MAP.logistica_entregadores).toBe("logistics_manage");
    expect(TAB_PERMISSION_MAP.disparos_notificacoes).toBe("notifications_manage");
    expect(TAB_PERMISSION_MAP.avatares).toBe("loyalty_manage");
  });

  it("garante soberania irrestrita ao Administrador atual mesmo sem permissões listadas", () => {
    const adminUpper = { id: "admin-1", role: "ADMIN", permissions: [] };
    const adminLower = { id: "admin-2", role: "admin", permissions: undefined };

    for (const admin of [adminUpper, adminLower]) {
      expect(isUserAdmin(admin)).toBe(true);
      expect(isUserEditor(admin)).toBe(false);
      for (const perm of ALL_PERMISSIONS) {
        expect(hasPermission(admin, perm)).toBe(true);
      }
      expect(hasPermission(admin, "any_future_permission")).toBe(true);
    }
  });

  it("combina permissões diretas e herdadas de customRole para Editor", () => {
    const editorWithCustomRole = {
      id: "ed-1",
      role: "EDITOR",
      permissions: ["ORDERS_KANBAN"],
      customRole: {
        id: "role-mkt",
        name: "Marketing",
        permissions: ["notifications_manage", "coupons_manage"],
      },
    };

    expect(hasPermission(editorWithCustomRole, "ORDERS_KANBAN")).toBe(true);
    expect(hasPermission(editorWithCustomRole, "notifications_manage")).toBe(true);
    expect(hasPermission(editorWithCustomRole, "coupons_manage")).toBe(true);
    expect(hasPermission(editorWithCustomRole, "logistics_manage")).toBe(false);
    expect(hasPermission(editorWithCustomRole, "users_manage")).toBe(false);
  });

  it("rejeita chaves de permissão desconhecidas na whitelist oficial", () => {
    const res = validatePermissionsInput([
      "ORDERS_KANBAN",
      "logistics_manage",
      "ORDERS_READ",
      "ADMIN_ALL",
      123,
    ]);

    expect(res.valid).toEqual(["ORDERS_KANBAN", "logistics_manage"]);
    expect(res.invalid).toEqual(["ORDERS_READ", "ADMIN_ALL", "123"]);
  });

  it("valida URLs de mídia e bloqueia esquemas perigosos (XSS/SSRF/Path Traversal)", () => {
    expect(isValidSafeAssetUrl("/avatars/avatar-sorvete.svg")).toBe(true);
    expect(isValidSafeAssetUrl("/uploads/banner.webp")).toBe(true);
    expect(isValidSafeAssetUrl("https://cdn.example.com/logo.png")).toBe(true);
    expect(isValidSafeAssetUrl("", true)).toBe(true);

    expect(isValidSafeAssetUrl("", false)).toBe(false);
    expect(isValidSafeAssetUrl("javascript:alert(1)")).toBe(false);
    expect(isValidSafeAssetUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isValidSafeAssetUrl("http://insecure.example.com/a.png")).toBe(false);
    expect(isValidSafeAssetUrl("//evil.com/x.png")).toBe(false);
    expect(isValidSafeAssetUrl("/avatars/../../etc/passwd")).toBe(false);
  });

  it("remove pixKey na projeção operacional de entregadores para despacho no Kanban", () => {
    const fullCourier = {
      id: "c-1",
      name: "Carlos Motoboy",
      phone: "65999998888",
      vehicle: "Honda CG 160",
      plate: "ABC-1234",
      pixKey: "65999998888",
      status: "available",
      isActive: true,
    };

    const dto = toCourierDispatchDto(fullCourier);
    expect(dto).toEqual({
      id: "c-1",
      name: "Carlos Motoboy",
      phone: "65999998888",
      vehicle: "Honda CG 160",
      plate: "ABC-1234",
      status: "available",
      isActive: true,
    });
    expect("pixKey" in dto).toBe(false);
  });

  it("permite que tanto ADMIN quanto EDITOR acessem o AdminLayout (/admin e /admin/pedidos) sem redirecionar Editor Modular para '/'", () => {
    const adminLayoutPath = path.join(process.cwd(), "src/app/admin/layout.tsx");
    const layoutSource = fs.readFileSync(adminLayoutPath, "utf-8");

    expect(layoutSource).toContain("const isStaff = isAdmin || isEditor");
    expect(layoutSource).not.toContain("if (!loading && !isAdmin)");
    expect(layoutSource).not.toMatch(/if\s*\(\s*!isAdmin\s*\)\s*\{\s*return\s+null/);
  });

  it("calcula rotas seguras de fallback em getAuthorizedAdminFallbackRoute evitando loops para Editores Modulares", () => {
    const editorOnlyKanban = {
      role: "editor",
      permissions: ["ORDERS_KANBAN"],
    };
    expect(getAuthorizedAdminFallbackRoute(editorOnlyKanban, "/admin")).toBe(
      "/admin/pedidos?unauthorized=true"
    );
    expect(getAuthorizedAdminFallbackRoute(editorOnlyKanban, "/admin/pedidos")).toBe(
      "/conta?unauthorized=true"
    );

    const editorOnlyCoupons = {
      role: "editor",
      permissions: ["coupons_manage"],
    };
    expect(getAuthorizedAdminFallbackRoute(editorOnlyCoupons, "/admin/pedidos")).toBe(
      "/admin?unauthorized=true"
    );

    const editorOnlyHistory = {
      role: "editor",
      permissions: ["ORDERS_HISTORY"],
    };
    expect(getAuthorizedAdminFallbackRoute(editorOnlyHistory, "/admin")).toBe(
      "/admin/historico?unauthorized=true"
    );

    const editorOnlyUsers = {
      role: "editor",
      permissions: ["users_manage"],
    };
    expect(getAuthorizedAdminFallbackRoute(editorOnlyUsers, "/admin/pedidos")).toBe(
      "/admin/usuarios?unauthorized=true"
    );
  });
});
