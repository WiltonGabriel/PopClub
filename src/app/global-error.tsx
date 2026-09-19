"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary:Global]", error.message, error.digest ? `(Digest: ${error.digest})` : "");
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#190B1A", color: "#F9F5F9", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px" }}>
        <div style={{ maxWidth: "480px", width: "100%", textAlign: "center", background: "#230E26", border: "1px solid #512B54", borderRadius: "24px", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🍧</div>
          <h1 style={{ fontSize: "20px", fontWeight: "900", margin: "0 0 12px 0", color: "#F9F5F9" }}>
            Instabilidade Temporária
          </h1>
          <p style={{ fontSize: "14px", color: "#C7A9C9", lineHeight: 1.5, margin: "0 0 24px 0" }}>
            Ocorreu uma falha inesperada no sistema. Estamos trabalhando para restaurar tudo com agilidade.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#9306CF",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "14px",
                padding: "12px 24px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Tentar Novamente
            </button>
            <a
              href="/"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                color: "#F9F5F9",
                border: "1px solid #512B54",
                borderRadius: "14px",
                padding: "12px 20px",
                fontWeight: "700",
                fontSize: "13px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Início
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
