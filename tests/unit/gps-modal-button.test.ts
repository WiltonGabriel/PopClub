import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("GpsInteractiveMapModal — Botão Compacto de Localização GPS", () => {
  const modalPath = path.resolve(
    process.cwd(),
    "src/components/storefront/GpsInteractiveMapModal.tsx"
  );

  it("remove os rótulos textuais visíveis ('Meu GPS' e 'Centralizar na Minha Posição') e mantém botão circular compacto", () => {
    const content = fs.readFileSync(modalPath, "utf-8");

    expect(content).not.toContain("Meu GPS");
    expect(content).not.toContain(">Centralizar na Minha Posição<");
    expect(content).toContain("w-11 h-11 rounded-full");
  });

  it("posiciona o controle centralizado verticalmente na lateral direita sem colidir com topo ou rodapé", () => {
    const content = fs.readFileSync(modalPath, "utf-8");

    expect(content).toContain("top-1/2 right-3 -translate-y-1/2");
    expect(content).toContain("z-[1000]");
  });

  it("fornece tooltip 'Minha localização', rótulo acessível aria-label e mantém handler handleCenterOnUserGps", () => {
    const content = fs.readFileSync(modalPath, "utf-8");

    expect(content).toContain('aria-label="Minha localização"');
    expect(content).toContain('title="Minha localização"');
    expect(content).toContain("Minha localização");
    expect(content).toContain('aria-hidden="true"');
    expect(content).toContain("onClick={handleCenterOnUserGps}");
  });
});
