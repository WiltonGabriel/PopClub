import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("BrandHomeLink — Seleção/Cópia do Nome PopShake e Navegação", () => {
  const brandLinkPath = path.resolve(
    process.cwd(),
    "src/components/storefront/BrandHomeLink.tsx"
  );
  const homePagePath = path.resolve(process.cwd(), "src/app/page.tsx");
  const footerPath = path.resolve(process.cwd(), "src/components/storefront/Footer.tsx");

  it("habilita seleção de texto (select-text) e desativa arraste nativo de link (draggable={false})", () => {
    const content = fs.readFileSync(brandLinkPath, "utf-8");

    expect(content).toContain("draggable={false}");
    expect(content).toContain("onDragStart={(e) => e.preventDefault()}");
    expect(content).toContain("select-text");
    expect(content).not.toContain("select-none");
  });

  it("previne navegação acidental quando o usuário arrasta para selecionar texto, mantendo clique simples para /", () => {
    const content = fs.readFileSync(brandLinkPath, "utf-8");

    expect(content).toContain('href="/"');
    expect(content).toContain("window.getSelection()?.toString()");
    expect(content).toContain("e.preventDefault()");
    expect(content).toContain("onNavigate?.()");
  });

  it("substitui ambos os logos no header mobile/desktop da home e libera seleção no rodapé", () => {
    const pageContent = fs.readFileSync(homePagePath, "utf-8");
    const footerContent = fs.readFileSync(footerPath, "utf-8");

    const matches = pageContent.match(/<BrandHomeLink/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(footerContent).toContain("flex items-center gap-2 select-text");
  });
});
