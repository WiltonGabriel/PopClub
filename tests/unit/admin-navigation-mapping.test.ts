import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ADMIN_NAV_GROUPS,
  ADMIN_TABS,
  getDefaultAdminSelection,
  getVisibleAdminGroups,
  isAdminTabAccessible,
  resolveAdminTabParam,
} from "@/lib/adminNavigation";
import { ALL_PERMISSIONS } from "@/lib/permissions";

describe("Arquitetura de Navegação em 2 Níveis e UX/UI do Painel (/admin)", () => {
  it("organiza o painel nos 5 grupos principais e separa Selos de Fidelidade de Banners & Selos", () => {
    const groupIds = ADMIN_NAV_GROUPS.map((g) => g.id);
    expect(groupIds).toEqual(["operacao", "catalogo", "marketing", "fidelidade", "sistema"]);

    const catalogo = ADMIN_NAV_GROUPS.find((g) => g.id === "catalogo")!;
    expect(catalogo.tabs.map((t) => t.id)).toEqual([
      "categorias",
      "produtos_base",
      "complementos",
      "combos",
      "promocoes",
      "banners_selos",
    ]);
    expect(catalogo.tabs[1].label).toBe("Produto Base");

    const fidelidade = ADMIN_NAV_GROUPS.find((g) => g.id === "fidelidade")!;
    expect(fidelidade.tabs.map((t) => t.id)).toEqual(["selos_fidelidade", "avatares"]);

    const sistema = ADMIN_NAV_GROUPS.find((g) => g.id === "sistema")!;
    expect(sistema.tabs.map((t) => t.id)).toEqual([
      "identidade_visual",
      "canais_atendimento",
      "auditoria",
    ]);
  });

  it("ADMIN mantém controle completo sobre todos os 5 grupos e todas as 14 sub-abas (incluindo auditoria)", () => {
    const adminUser = { role: "ADMIN", permissions: [] };
    const groups = getVisibleAdminGroups(adminUser);
    expect(groups).toHaveLength(5);
    const totalVisibleTabs = groups.reduce((acc, g) => acc + g.tabs.length, 0);
    expect(totalVisibleTabs).toBe(ADMIN_TABS.length);
    expect(isAdminTabAccessible(adminUser, "auditoria")).toBe(true);
    expect(isAdminTabAccessible(adminUser, "selos_fidelidade")).toBe(true);
    expect(isAdminTabAccessible(adminUser, "logistica_entregadores")).toBe(true);
  });

  it("EDITOR mesmo com todas as permissões delegáveis nunca acessa Auditoria & Logs", () => {
    const superEditor = { role: "EDITOR", permissions: [...ALL_PERMISSIONS] };
    expect(isAdminTabAccessible(superEditor, "auditoria")).toBe(false);
    expect(isAdminTabAccessible(superEditor, "canais_atendimento")).toBe(true);

    const limitedEditor = {
      role: "EDITOR",
      permissions: ["loyalty_manage", "coupons_manage"],
    };
    const groups = getVisibleAdminGroups(limitedEditor);
    expect(groups.map((g) => g.id)).toEqual(["marketing", "fidelidade"]);
    expect(groups[0].tabs.map((t) => t.id)).toEqual(["cupons"]);
    expect(groups[1].tabs.map((t) => t.id)).toEqual(["selos_fidelidade", "avatares"]);
  });

  it("CLIENT e anônimo não recebem grupos ou seleção padrão", () => {
    expect(getVisibleAdminGroups(null)).toEqual([]);
    expect(getVisibleAdminGroups({ role: "CLIENT", permissions: [...ALL_PERMISSIONS] })).toEqual([]);
    expect(getDefaultAdminSelection({ role: "CLIENT" })).toBeNull();
  });

  it("preserva compatibilidade de deep-links ?tab=... legados e bloqueia tabs não autorizadas", () => {
    const adminUser = { role: "ADMIN" };
    const legacyCases: Array<[string, string]> = [
      ["metricas", "operacao"],
      ["logistica_entregadores", "operacao"],
      ["produtos_base", "catalogo"],
      ["categorias", "catalogo"],
      ["complementos", "catalogo"],
      ["combos", "catalogo"],
      ["promocoes", "catalogo"],
      ["banners_selos", "catalogo"],
      ["cupons", "marketing"],
      ["disparos_notificacoes", "marketing"],
      ["selos_fidelidade", "fidelidade"],
      ["avatares", "fidelidade"],
      ["identidade_visual", "sistema"],
      ["canais_atendimento", "sistema"],
      ["auditoria", "sistema"],
    ];

    for (const [tabId, expectedGroup] of legacyCases) {
      const resolved = resolveAdminTabParam(tabId, adminUser);
      expect(resolved.valid).toBe(true);
      expect(resolved.unauthorized).toBe(false);
      expect(resolved.tabId).toBe(tabId);
      expect(resolved.groupId).toBe(expectedGroup);
    }

    const editorNoLogistics = { role: "EDITOR", permissions: ["menu_manage"] };
    const blocked = resolveAdminTabParam("logistica_entregadores", editorNoLogistics);
    expect(blocked.valid).toBe(true);
    expect(blocked.unauthorized).toBe(true);

    const blockedAudit = resolveAdminTabParam("auditoria", {
      role: "EDITOR",
      permissions: [...ALL_PERMISSIONS],
    });
    expect(blockedAudit.valid).toBe(true);
    expect(blockedAudit.unauthorized).toBe(true);
  });

  it("elimina alert() e confirm() nativos nas áreas auditadas, no shell /admin/page.tsx e na gestão de usuários", () => {
    const usersSubcomponentsDir = path.resolve(process.cwd(), "src/components/admin/users");
    const usersSubcomponents = fs
      .readdirSync(usersSubcomponentsDir)
      .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
      .map((name) => `src/components/admin/users/${name}`);

    const auditedFiles = [
      "src/app/admin/page.tsx",
      "src/components/admin/UsersManagementSection.tsx",
      ...usersSubcomponents,
      "src/components/admin/LogisticsAndCouriersSection.tsx",
      "src/components/admin/DeliveryFeeSettings.tsx",
      "src/components/admin/OrderFlowSettings.tsx",
      "src/components/admin/CardBadgesSection.tsx",
      "src/components/admin/LoyaltyBadgesSection.tsx",
      "src/components/admin/AvatarPresetManager.tsx",
      "src/components/admin/ChannelsAndSupportSection.tsx",
      "src/components/admin/CommunicationSection.tsx",
      "src/components/admin/CustomAudienceModal.tsx",
      "src/components/admin/CouponManagement.tsx",
    ];

    for (const relPath of auditedFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const source = fs.readFileSync(fullPath, "utf8");
      expect(source, `${relPath} ainda contém alert() nativo`).not.toMatch(/\balert\s*\(/);
      expect(source, `${relPath} ainda contém confirm() nativo`).not.toMatch(
        /\b(?:window\.)?confirm\s*\(/
      );
    }

    // Confirmar também que banners_selos em admin/page.tsx não embute mais LoyaltyBadgesSection
    const adminPage = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/admin/page.tsx"),
      "utf8"
    );
    const bannersBlockMatch = adminPage.match(/activeTab === "banners_selos"[\s\S]*?<\/section>/);
    expect(bannersBlockMatch).toBeTruthy();
    expect(bannersBlockMatch![0]).not.toContain("<LoyaltyBadgesSection");
    expect(adminPage).toContain('activeTab === "selos_fidelidade"');
    expect(adminPage).toContain('activeTab === "auditoria"');
  });
});
