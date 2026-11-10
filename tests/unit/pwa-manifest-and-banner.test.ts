import { describe, it, expect } from "vitest";
import manifest from "@/app/manifest";
import fs from "fs";
import path from "path";

describe("PWA — Manifest, Ícones e Configuração de PWA", () => {
  it("deve exportar um Web App Manifest válido para conformidade com PWA e W3C", () => {
    const data = manifest();

    expect(data.name).toBe("Pop Shake Sorveteria - Açaí & Sorvetes");
    expect(data.short_name).toBe("Pop Shake");
    expect(data.display).toBe("standalone");
    expect(data.start_url).toBe("/");
    expect(data.background_color).toBe("#0B0F19");
    expect(data.theme_color).toBe("#8B5CF6");
    expect(data.icons).toBeDefined();
    expect(data.icons!.length).toBeGreaterThanOrEqual(2);

    // Validação de ícones mínimos exigidos pelo Google PWA / Lighthouse
    const icon192 = data.icons!.find((i) => i.sizes === "192x192");
    const icon512 = data.icons!.find((i) => i.sizes === "512x512");
    const maskableIcon = data.icons!.find((i) => i.purpose === "maskable");

    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
    expect(maskableIcon).toBeDefined();
  });

  it("garante que os arquivos físicos dos ícones do manifest existem na pasta public/", () => {
    const publicDir = path.resolve(process.cwd(), "public");
    const data = manifest();

    for (const icon of data.icons || []) {
      const cleanPath = icon.src.replace(/^\//, "");
      const fullPath = path.join(publicDir, cleanPath);
      expect(fs.existsSync(fullPath), `Arquivo ${icon.src} deve existir em public/`).toBe(true);
    }
  });
});
