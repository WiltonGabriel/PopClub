import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { cn } from "@/lib/utils";
import { IMAGE_CROPPER_DIALOG_CONTENT_CLASS } from "@/components/admin/ImageCropperDialog";
import { CUSTOM_AUDIENCE_DIALOG_CONTENT_CLASS } from "@/components/admin/CustomAudienceModal";

const BASE_DIALOG_CONTENT_CLASS =
  "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

describe("Responsividade e Largura Segura de Modais (DialogContent)", () => {
  it("sobrescreve sm:max-w-sm e previne overflow horizontal no ImageCropperDialog", () => {
    const merged = cn(BASE_DIALOG_CONTENT_CLASS, IMAGE_CROPPER_DIALOG_CONTENT_CLASS);

    expect(merged).toContain("sm:max-w-[680px]");
    expect(merged).not.toContain("sm:max-w-sm");
    expect(merged).toContain("overflow-x-hidden");
    expect(merged).toContain("flex");
    expect(merged).not.toMatch(/(^|\s)grid(\s|$)/);
  });

  it("sobrescreve sm:max-w-sm e previne overflow horizontal no CustomAudienceModal", () => {
    const merged = cn(BASE_DIALOG_CONTENT_CLASS, CUSTOM_AUDIENCE_DIALOG_CONTENT_CLASS);

    expect(merged).toContain("sm:max-w-4xl");
    expect(merged).not.toContain("sm:max-w-sm");
    expect(merged).toContain("overflow-x-hidden");
  });

  it("verifica que nenhum DialogContent largo no painel fique preso por sm:max-w-sm", () => {
    const adminDir = path.resolve(process.cwd(), "src/components/admin");
    const entries = fs.readdirSync(adminDir, { withFileTypes: true });
    const wideDialogWithoutSmOverride: string[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".tsx")) continue;
      const content = fs.readFileSync(path.join(adminDir, entry.name), "utf-8");
      const matches = content.match(/<DialogContent\s+className="([^"]+)"/g) || [];
      for (const m of matches) {
        const classMatch = m.match(/className="([^"]+)"/);
        const cls = classMatch?.[1] || "";
        const requestsWide =
          /\bmax-w-(lg|xl|2xl|3xl|4xl|5xl|\[[4-9]\d{2}px\])/.test(cls);
        const hasSmOverride = /\bsm:max-w-/.test(cls);
        if (requestsWide && !hasSmOverride) {
          wideDialogWithoutSmOverride.push(`${entry.name}: ${cls}`);
        }
      }
    }

    expect(wideDialogWithoutSmOverride).toEqual([]);
  });

  it("exibe nomes completos de grupos de complementos sem truncamento no ProductFormDialog e ProductAddonLinksTab", () => {
    const productFormPath = path.resolve(
      process.cwd(),
      "src/components/admin/ProductFormDialog.tsx"
    );
    const productFormSrc = fs.readFileSync(productFormPath, "utf-8");

    expect(productFormSrc).toContain("flex flex-col gap-2 max-h-64 overflow-y-auto pr-1");
    expect(productFormSrc).not.toMatch(/truncate[^>]*>\{group\.name\}/);

    const linksTabPath = path.resolve(
      process.cwd(),
      "src/components/admin/addons/ProductAddonLinksTab.tsx"
    );
    const linksTabSrc = fs.readFileSync(linksTabPath, "utf-8");
    expect(linksTabSrc).not.toContain('truncate max-w-[180px]">{group.name}');
    expect(linksTabSrc).not.toMatch(/className="[^"]*truncate[^"]*">\s*\{group\.name\}/);
  });

  it("garante botão de salvar fixo no topo, lembrete de alterações não salvas e edição de foto atual no ProductFormDialog", () => {
    const productFormPath = path.resolve(
      process.cwd(),
      "src/components/admin/ProductFormDialog.tsx"
    );
    const productFormSrc = fs.readFileSync(productFormPath, "utf-8");

    expect(productFormSrc).toContain('form="product-editor-form"');
    expect(productFormSrc).toContain("Alterações não salvas");
    expect(productFormSrc).toContain("Editar / Recortar Imagem Atual");
  });
});
