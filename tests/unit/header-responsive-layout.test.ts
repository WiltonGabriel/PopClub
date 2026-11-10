import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Header Desktop — Responsividade e Prevenção de Colisão em Monitores Verticais", () => {
  const adminTogglePath = path.resolve(process.cwd(), "src/components/admin/AdminEditModeToggle.tsx");
  const headerAddressPath = path.resolve(process.cwd(), "src/components/storefront/HeaderAddressButton.tsx");
  const pagePath = path.resolve(process.cwd(), "src/app/page.tsx");

  it("garante que AdminEditModeToggle oculta rótulo de texto em telas < xl para caber em monitores verticais", () => {
    const content = fs.readFileSync(adminTogglePath, "utf-8");

    // Deve conter classes responsivas xl: para exibição do texto ("Edição" / "Cliente")
    expect(content).toContain("hidden xl:flex");
    expect(content).toContain("Edição");
    expect(content).toContain("Cliente");
  });

  it("garante que HeaderAddressButton possui largura máxima restrita em telas intermediárias (md/lg)", () => {
    const content = fs.readFileSync(headerAddressPath, "utf-8");

    // Deve conter truncamento progressivo
    expect(content).toContain("md:max-w-[140px]");
    expect(content).toContain("lg:max-w-[180px]");
    expect(content).toContain("xl:max-w-[240px]");
  });

  it("garante que o container de busca em page.tsx permite encolhimento fluido com min-w-0", () => {
    const content = fs.readFileSync(pagePath, "utf-8");

    // Não deve conter min-w-[200px] rígido que cause transbordamento sobre o toggle
    expect(content).toContain("flex-1 min-w-0 max-w-[440px]");
  });

  it("garante que o nome do usuário no cabeçalho fica oculto em monitores verticais (< xl) exibindo apenas avatar", () => {
    const content = fs.readFileSync(pagePath, "utf-8");

    // O nome do usuário e chevron devem usar hidden xl:inline-flex
    expect(content).toContain("hidden xl:inline-flex text-xs sm:text-sm font-semibold");
    expect(content).toContain("hidden xl:inline-flex w-3.5 h-3.5 text-muted-foreground");
  });
});
