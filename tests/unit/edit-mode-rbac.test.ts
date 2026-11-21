import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import {
  EditModeProvider,
  useEditMode,
  canUserAccessEditMode,
  resolveEditModeCapabilities,
} from "@/contexts/EditModeContext";

function SnapshotEditModeConsumer() {
  const { isEditMode, isDesktop, canUseEditMode } = useEditMode();
  return React.createElement(
    "pre",
    { "data-testid": "edit-mode-state" },
    JSON.stringify({ isEditMode, isDesktop, canUseEditMode })
  );
}

describe("Modo Edição na Vitrine — RBAC & Segurança de Inicialização", () => {
  it("autoriza canUserAccessEditMode apenas para ADMIN ou EDITOR com storefront_edit (direto ou via customRole)", () => {
    expect(canUserAccessEditMode({ role: "ADMIN", permissions: [] })).toBe(true);
    expect(canUserAccessEditMode({ role: "admin" })).toBe(true);

    expect(
      canUserAccessEditMode({
        role: "EDITOR",
        permissions: ["storefront_edit"],
      })
    ).toBe(true);

    expect(
      canUserAccessEditMode({
        role: "EDITOR",
        permissions: ["ORDERS_KANBAN"],
        customRole: { permissions: ["storefront_edit"] },
      })
    ).toBe(true);

    expect(
      canUserAccessEditMode({
        role: "EDITOR",
        permissions: ["menu_manage", "promotions_manage", "theme_manage"],
      })
    ).toBe(false);

    expect(
      canUserAccessEditMode({
        role: "CLIENT",
        permissions: ["storefront_edit"],
      })
    ).toBe(false);

    expect(canUserAccessEditMode(null)).toBe(false);
    expect(canUserAccessEditMode(undefined)).toBe(false);
    expect(canUserAccessEditMode({})).toBe(false);
  });

  it("calcula capacidades granulares da vitrine conforme isEditMode, viewport e permissões", () => {
    const adminIdle = resolveEditModeCapabilities({ role: "ADMIN" }, false, true);
    expect(adminIdle).toEqual({
      canUseEditMode: true,
      canEditStorefront: false,
      canEditCatalog: false,
      canEditPromotions: false,
      canEditHighlightBanner: false,
      canReorderSections: false,
    });

    const adminActive = resolveEditModeCapabilities({ role: "ADMIN" }, true, true);
    expect(adminActive).toEqual({
      canUseEditMode: true,
      canEditStorefront: true,
      canEditCatalog: true,
      canEditPromotions: true,
      canEditHighlightBanner: true,
      canReorderSections: true,
    });

    const adminMobile = resolveEditModeCapabilities({ role: "ADMIN" }, true, false);
    expect(adminMobile.canUseEditMode).toBe(false);
    expect(adminMobile.canEditStorefront).toBe(false);

    const catalogEditor = resolveEditModeCapabilities(
      { role: "EDITOR", permissions: ["storefront_edit", "menu_manage"] },
      true,
      true
    );
    expect(catalogEditor).toEqual({
      canUseEditMode: true,
      canEditStorefront: true,
      canEditCatalog: true,
      canEditPromotions: false,
      canEditHighlightBanner: false,
      canReorderSections: true,
    });

    const promoEditor = resolveEditModeCapabilities(
      { role: "EDITOR", permissions: ["storefront_edit", "promotions_manage"] },
      true,
      true
    );
    expect(promoEditor.canEditPromotions).toBe(true);
    expect(promoEditor.canEditCatalog).toBe(false);
    expect(promoEditor.canEditHighlightBanner).toBe(false);

    const themeEditor = resolveEditModeCapabilities(
      { role: "EDITOR", permissions: ["storefront_edit", "theme_manage"] },
      true,
      true
    );
    expect(themeEditor.canEditHighlightBanner).toBe(true);
    expect(themeEditor.canEditCatalog).toBe(false);
    expect(themeEditor.canEditPromotions).toBe(false);
  });

  it("inicializa EditModeProvider com isEditMode=false e canUseEditMode=false por padrão", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        EditModeProvider,
        null,
        React.createElement(SnapshotEditModeConsumer)
      )
    );

    const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
    expect(match).not.toBeNull();
    const decoded = match![1].replace(/&quot;/g, '"');
    const state = JSON.parse(decoded);

    expect(state).toEqual({
      isEditMode: false,
      isDesktop: false,
      canUseEditMode: false,
    });
  });

  it("garante contrato estrutural de inicialização segura, limpeza de localStorage legado e RBAC na vitrine", () => {
    const editModePath = path.resolve(process.cwd(), "src/contexts/EditModeContext.tsx");
    const editModeSrc = fs.readFileSync(editModePath, "utf-8");

    expect(editModeSrc).toContain("useState<boolean>(false)");
    expect(editModeSrc).not.toContain("useState<boolean>(true)");
    expect(editModeSrc).not.toContain("localStorage.getItem(STORAGE_KEY)");
    expect(editModeSrc).not.toContain("localStorage.setItem(STORAGE_KEY");
    expect(editModeSrc).toContain("localStorage.removeItem(STORAGE_KEY)");
    expect(editModeSrc).toContain("[user?.id, hasEditPermission]");
    expect(editModeSrc).toContain("if (!canUseEditMode");

    const togglePath = path.resolve(
      process.cwd(),
      "src/components/admin/AdminEditModeToggle.tsx"
    );
    const toggleSrc = fs.readFileSync(togglePath, "utf-8");
    expect(toggleSrc).toContain("canUseEditMode");
    expect(toggleSrc).toContain("!isDesktop || !canUseEditMode");

    const pagePath = path.resolve(process.cwd(), "src/app/page.tsx");
    const pageSrc = fs.readFileSync(pagePath, "utf-8");
    expect(pageSrc).toContain("{canUseEditMode && <AdminEditModeToggle />}");
    expect(pageSrc).not.toContain("{isAdmin && <AdminEditModeToggle />}");
    expect(pageSrc).toContain('canAccess("menu_manage")');
    expect(pageSrc).toContain('canAccess("theme_manage")');

    const promoPath = path.resolve(
      process.cwd(),
      "src/components/storefront/PromoBanner.tsx"
    );
    const promoSrc = fs.readFileSync(promoPath, "utf-8");
    expect(promoSrc).toContain("canUseEditMode");
    expect(promoSrc).toContain('canAccess("promotions_manage")');
  });

  it("garante diálogos acessíveis, índice visível na reordenação, barra de status do Modo Edição e visibilidade de controles na vitrine", () => {
    const pagePath = path.resolve(process.cwd(), "src/app/page.tsx");
    const pageSrc = fs.readFileSync(pagePath, "utf-8");

    expect(pageSrc).toContain("ConfirmDialog");
    expect(pageSrc).not.toContain("window.confirm(");
    expect(pageSrc).not.toContain("if (confirm(");
    expect(pageSrc).toContain("{catIndex + 1}/{visibleCategories.length}");
    expect(pageSrc).toContain("disabled={catIndex === visibleCategories.length - 1}");
    expect(pageSrc).toContain("Modo Edição Ativo");
    expect(pageSrc).toContain("Sair do Modo Edição");
    expect(pageSrc).toContain("setEditMode(false)");
    expect(pageSrc).toContain('canAccess("promotions_manage")');
    expect(pageSrc).toContain("Apenas reordenação de seções liberada para este perfil");

    const productCardPath = path.resolve(
      process.cwd(),
      "src/components/storefront/ProductCard.tsx"
    );
    const productCardSrc = fs.readFileSync(productCardPath, "utf-8");
    expect(productCardSrc).toContain("opacity-95");
    expect(productCardSrc).not.toContain("opacity-0");

    const categoryRailPath = path.resolve(
      process.cwd(),
      "src/components/storefront/CategoryRail.tsx"
    );
    const categoryRailSrc = fs.readFileSync(categoryRailPath, "utf-8");
    expect(categoryRailSrc).toContain("pt-5 pb-2.5");
  });
});
