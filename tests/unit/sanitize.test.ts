import { describe, it, expect } from "vitest";
import { sanitizeText, sanitizePayload } from "@/lib/sanitize";

describe("sanitizeText (Defesa e Sanitização contra XSS)", () => {
  it("retorna string vazia para entradas nulas, indefinidas ou não-string", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
    expect(sanitizeText("" as unknown as string)).toBe("");
    expect(sanitizeText(123 as unknown as string)).toBe("");
  });

  it("remove tags <script> completas e seu conteúdo malicioso", () => {
    const malicious = "Olá <script>alert('xss')</script>Mundo!";
    expect(sanitizeText(malicious)).toBe("Olá Mundo!");
  });

  it("remove tags <style> e seu conteúdo", () => {
    const styled = "Texto <style>body { display: none; }</style>visível";
    expect(sanitizeText(styled)).toBe("Texto visível");
  });

  it("remove tags HTML remanescentes mantendo o texto interno", () => {
    const html = "<p>Parágrafo com <strong>negrito</strong> e <a href='https://evil.com'>link</a></p>";
    expect(sanitizeText(html)).toBe("Parágrafo com negrito e link");
  });

  it("remove manipuladores de eventos on* maliciosos", () => {
    const eventHandler = '<img src="x" onerror="alert(1)" onload="evil()" />';
    expect(sanitizeText(eventHandler)).toBe("");
  });

  it("remove prefixo javascript: em URIs", () => {
    const jsUri = "javascript:alert('pwned')";
    expect(sanitizeText(jsUri)).toBe("alert('pwned')");
  });

  it("remove espaços em branco excessivos nas pontas (trim)", () => {
    expect(sanitizeText("   Pop Shake Artesanal   ")).toBe("Pop Shake Artesanal");
  });
});

describe("sanitizePayload (Sanitização recursiva de payloads e DTOs)", () => {
  it("mantém valores nulos ou indefinidos sem quebrar", () => {
    expect(sanitizePayload(null)).toBeNull();
    expect(sanitizePayload(undefined)).toBeUndefined();
  });

  it("sanitiza strings isoladas", () => {
    expect(sanitizePayload("<b>Negrito</b>")).toBe("Negrito");
  });

  it("sanitiza arrays de strings de forma recursiva", () => {
    const input = ["<b>Item 1</b>", "<script>alert(2)</script>Item 2", "Item 3 limpo"];
    expect(sanitizePayload(input)).toEqual(["Item 1", "Item 2", "Item 3 limpo"]);
  });

  it("sanitiza objetos profundamente aninhados preservando outros tipos primitivos", () => {
    const input = {
      customerName: " Wilton <script>hack()</script> ",
      age: 25,
      isActive: true,
      notes: "Sem calda <img src=x onerror=alert(1)> por favor",
      address: {
        street: "<b>Rua das Flores</b>",
        number: 120,
      },
      tags: ["<i>VIP</i>", "Frequente"],
    };

    const sanitized = sanitizePayload(input);

    expect(sanitized.customerName).toBe("Wilton");
    expect(sanitized.age).toBe(25);
    expect(sanitized.isActive).toBe(true);
    expect(sanitized.notes).toBe("Sem calda  por favor");
    expect(sanitized.address.street).toBe("Rua das Flores");
    expect(sanitized.address.number).toBe(120);
    expect(sanitized.tags).toEqual(["VIP", "Frequente"]);
  });
});
