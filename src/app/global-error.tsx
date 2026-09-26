"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    console.error("[ErrorBoundary:Global]", error.message, error.digest ? `(Digest: ${error.digest})` : "");
    try {
      const stored = localStorage.getItem("popshake-theme");
      setIsDark(stored !== "light");
    } catch {
      setIsDark(true);
    }
  }, [error]);

  const bgPage = isDark ? "#120713" : "#FAF6F9";
  const bgCard = isDark ? "rgba(31, 11, 34, 0.9)" : "rgba(255, 255, 255, 0.95)";
  const borderCard = isDark ? "rgba(81, 43, 84, 0.6)" : "rgba(229, 231, 235, 0.9)";
  const textColor = isDark ? "hsl(var(--foreground))" : "hsl(var(--foreground))";
  const subtextColor = isDark ? "hsl(var(--muted-foreground))" : "#6B7280";

  return (
    <html lang="pt-BR">
      <head>
        <title>Instabilidade Temporária - Pop Shake</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @keyframes floatGentle {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            @keyframes pulseGlow {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(1.08); }
            }
            .floating-icon {
              animation: floatGentle 3s ease-in-out infinite;
            }
            .glow-orb {
              animation: pulseGlow 4s ease-in-out infinite;
            }
          `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: bgPage,
          color: textColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "20px",
          position: "relative",
          overflow: "hidden",
          transition: "background-color 0.3s ease",
        }}
      >
        {/* Glow de fundo */}
        <div
          className="glow-orb"
          style={{
            position: "absolute",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(147,6,207,0.2) 0%, rgba(255,0,122,0) 70%)",
            top: "20%",
            left: "10%",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: "480px",
            width: "100%",
            textAlign: "center",
            background: bgCard,
            border: `1px solid ${borderCard}`,
            borderRadius: "28px",
            padding: "36px 28px",
            boxShadow: isDark ? "0 25px 50px -12px rgba(0,0,0,0.7)" : "0 20px 40px -10px rgba(147,6,207,0.08)",
            backdropFilter: "blur(16px)",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Ícone com flutuação suave */}
          <div className="floating-icon" style={{ fontSize: "52px", marginBottom: "16px", display: "inline-block" }}>
            🍧
          </div>

          <h1 style={{ fontSize: "22px", fontWeight: "900", margin: "0 0 10px 0", color: textColor, textTransform: "uppercase", letterSpacing: "0.02em" }}>
            Instabilidade Temporária
          </h1>
          <p style={{ fontSize: "14px", color: subtextColor, lineHeight: 1.6, margin: "0 0 24px 0" }}>
            Não se preocupe, seus dados e pedidos estão seguros. Estamos trabalhando para restaurar a conexão de forma imediata.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "16px",
                padding: "14px 28px",
                fontWeight: "800",
                fontSize: "13px",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                boxShadow: "0 8px 20px rgba(147,6,207,0.3)",
                transition: "transform 0.15s ease",
              }}
            >
              Tentar Novamente
            </button>
            <Link
              href="/"
              style={{
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#F3F4F6",
                color: textColor,
                border: `1px solid ${borderCard}`,
                borderRadius: "16px",
                padding: "14px 24px",
                fontWeight: "700",
                fontSize: "13px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Início
            </Link>
          </div>

          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: `1px solid ${isDark ? "rgba(81, 43, 84, 0.4)" : "rgba(229, 231, 235, 0.8)"}` }}>
            <a
              href="https://wa.me/5584999999999?text=Ol%C3%A1!%20Ocorreu%20uma%20instabilidade%20no%20aplicativo%20e%20gostaria%20de%20aux%C3%ADlio."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "12px",
                color: "#10B981",
                textDecoration: "none",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              💬 Falar com suporte no WhatsApp
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
