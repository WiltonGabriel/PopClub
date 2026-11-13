import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  RESTORE_INSERT_ORDER,
  buildPrelaunchCleanupReport,
} from "@/lib/prelaunchCleanupPlan";

describe("Integridade de Backup/Restore e Plano de Limpeza Pré-Lançamento", () => {
  it("scripts/restore-db.mjs usa nomes reais em snake_case cobrindo todos os modelos de prisma/schema.prisma", async () => {
    const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    const mapMatches = [...schemaContent.matchAll(/@@map\("([^"]+)"\)/g)].map((m) => m[1]);
    const expectedDbTables = mapMatches.filter((t) => t !== "_backup_metadata");

    // Nenhuma entrada PascalCase legada pode existir
    for (const table of RESTORE_INSERT_ORDER) {
      expect(table).toBe(table.toLowerCase());
      expect(table).not.toMatch(/[A-Z]/);
    }

    // Todas as tabelas do schema estão presentes em RESTORE_INSERT_ORDER
    for (const dbTable of expectedDbTables) {
      expect(RESTORE_INSERT_ORDER).toContain(dbTable);
    }

    // Garante paridade exata entre prelaunchCleanupPlan e scripts/restore-db.mjs
    const restoreScript = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/restore-db.mjs"),
      "utf-8"
    );
    for (const dbTable of expectedDbTables) {
      expect(restoreScript).toContain(`'${dbTable}'`);
    }
    expect(restoreScript).not.toContain("'StoreSettings'");
    expect(restoreScript).not.toContain("'User'");
    expect(restoreScript).not.toContain("catch {\n            // Ignora");

    // Garante ordem topológica mínima (pais antes de filhos)
    expect(RESTORE_INSERT_ORDER.indexOf("custom_roles")).toBeLessThan(
      RESTORE_INSERT_ORDER.indexOf("users")
    );
    expect(RESTORE_INSERT_ORDER.indexOf("users")).toBeLessThan(
      RESTORE_INSERT_ORDER.indexOf("user_locations")
    );
    expect(RESTORE_INSERT_ORDER.indexOf("users")).toBeLessThan(
      RESTORE_INSERT_ORDER.indexOf("orders")
    );
    expect(RESTORE_INSERT_ORDER.indexOf("products")).toBeLessThan(
      RESTORE_INSERT_ORDER.indexOf("order_items")
    );
    expect(RESTORE_INSERT_ORDER.indexOf("orders")).toBeLessThan(
      RESTORE_INSERT_ORDER.indexOf("order_items")
    );
  });

  it("buildPrelaunchCleanupReport bloqueia limpeza se activeAdmins < 1", () => {
    const report = buildPrelaunchCleanupReport({
      counts: {
        activeAdmins: 0,
        editors: 1,
        clientsTotal: 10,
        clientsRegistered: 5,
        clientsFastAccess: 5,
        orders: 20,
        orderItems: 30,
        couponRedemptions: 3,
        notifications: 2,
        userNotifications: 10,
        customAudienceLists: 1,
        userLocations: 8,
        shifts: 4,
        coupons: 3,
        products: 15,
        promotions: 2,
        categories: 5,
        couriers: 2,
      },
    });

    expect(report.safeToExecute).toBe(false);
    expect(report.blockReason).toContain("ADMIN");
  });

  it("buildPrelaunchCleanupReport preserva ADMIN, EDITOR, catálogo e sinaliza placeholders de dev", () => {
    const report = buildPrelaunchCleanupReport({
      counts: {
        activeAdmins: 1,
        editors: 2,
        clientsTotal: 12,
        clientsRegistered: 8,
        clientsFastAccess: 4,
        orders: 45,
        orderItems: 90,
        couponRedemptions: 6,
        notifications: 4,
        userNotifications: 48,
        customAudienceLists: 2,
        userLocations: 12,
        shifts: 5,
        coupons: 4,
        products: 28,
        promotions: 3,
        categories: 6,
        couriers: 3,
      },
      storeSettings: {
        whatsappNumber: "5565999999999",
        storeCnpj: "",
      },
      courierNames: ["Carlos Silva", "Motoboy Real"],
      adminEmails: ["admin@popclub.com"],
    });

    expect(report.safeToExecute).toBe(true);
    expect(report.blockReason).toBeNull();
    expect(report.willDelete.clientUsers).toBe(12);
    expect(report.willDelete.orders).toBe(45);
    expect(report.willPreserve.activeAdmins).toBe(1);
    expect(report.willPreserve.editors).toBe(2);
    expect(report.willPreserve.products).toBe(28);
    expect(report.willPreserve.categories).toBe(6);
    expect(report.hygieneWarnings.length).toBeGreaterThanOrEqual(4);
  });

  it("scripts/prelaunch-cleanup.mjs nunca deleta ADMIN/EDITOR ou catálogo", () => {
    const cleanupScript = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/prelaunch-cleanup.mjs"),
      "utf-8"
    );
    expect(cleanupScript).toContain("where: { role: Role.CLIENT }");
    expect(cleanupScript).toContain("--confirm-wipe");
    expect(cleanupScript).toContain("backup-db.mjs");
    expect(cleanupScript).not.toContain("product.deleteMany");
    expect(cleanupScript).not.toContain("category.deleteMany");
    expect(cleanupScript).not.toContain("storeSettings.deleteMany");
    expect(cleanupScript).not.toContain("customRole.deleteMany");
  });
});
