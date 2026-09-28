/**
 * Utilitário seguro de formatação de valores monetários e numéricos.
 * Previne erros de runtime como `TypeError: n.price.toFixed is not a function`
 * garantindo conversão explícita com fallback padrão.
 */

export function formatCurrency(value: number | string | null | undefined): string {
  const numericValue = typeof value === "number" ? value : Number(value) || 0;
  return numericValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDecimal(value: number | string | null | undefined): string {
  const numericValue = typeof value === "number" ? value : Number(value) || 0;
  return numericValue.toFixed(2).replace(".", ",");
}

export function parseSafeNumber(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}
