import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("PromoDetailPage & .btn-clay — Contraste do Botão Verde de Compra", () => {
  const promoPagePath = path.resolve(
    process.cwd(),
    "src/app/promo/[id]/page.tsx"
  );
  const globalsCssPath = path.resolve(process.cwd(), "src/app/globals.css");

  it("aplica fundo verde sólido (bg-brand-folha-acai) nos CTAs .btn-clay com text-white na página da promoção", () => {
    const content = fs.readFileSync(promoPagePath, "utf-8");

    const btnClayClasses = content.match(/className="[^"]*\bbtn-clay\b[^"]*"/g) || [];
    expect(btnClayClasses.length).toBe(2);

    for (const classAttr of btnClayClasses) {
      expect(classAttr).toContain("bg-brand-folha-acai");
      expect(classAttr).toContain("hover:bg-brand-folha-acai-dk");
      expect(classAttr).toContain("text-white");
    }
  });

  it("garante fallback explícito de background, cor e borda em Forced Colors Mode na classe .btn-clay", () => {
    const css = fs.readFileSync(globalsCssPath, "utf-8");

    expect(css).toContain("background-color: var(--color-folha-acai);");
    expect(css).toContain("color: #ffffff;");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("border: 2px solid ButtonText;");
  });
});
