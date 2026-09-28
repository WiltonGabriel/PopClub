/**
 * Utilitários para validação, limpeza e formatação de CPF (Cadastro de Pessoas Físicas).
 */

export function cleanCpf(cpf: string | null | undefined): string {
  if (!cpf) return "";
  return cpf.replace(/\D/g, "");
}

export function formatCpf(cpf: string | null | undefined): string {
  const digits = cleanCpf(cpf);
  if (!digits || digits.length !== 11) return cpf || "";
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function validateCpf(cpf: string | null | undefined): boolean {
  const digits = cleanCpf(cpf);
  if (!digits || digits.length !== 11) return false;

  // Rejeita sequências de dígitos repetidos (ex: "11111111111", "00000000000")
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Validação do 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9), 10)) return false;

  // Validação do 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10), 10)) return false;

  return true;
}
