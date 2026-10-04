"use client";

import React, { useEffect, useRef } from "react";

export interface DynamicCanvasBackgroundProps {
  style?:
    | "constellation"
    | "aurora_orbs"
    | "noctalia_mesh"
    | "aurora_mesh"
    | "fluid_orbs"
    | string;
  isDark?: boolean;
  className?: string;
  // Se fornecido, restringe o rastreamento do mouse ao container de preview mock
  previewContainerRef?: React.RefObject<HTMLElement | null>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  alpha: number;
}

export function DynamicCanvasBackground({
  style = "aurora_mesh",
  isDark = false,
  className = "",
  previewContainerRef,
}: DynamicCanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Normalização das chaves de estilo para evitar quebra com hífen ou underline
    const normalizedKey = (style || "aurora_mesh").toLowerCase().replace(/-/g, "_");
    const isFluidOrbs =
      normalizedKey === "fluid_orbs" || normalizedKey === "aurora_orbs";
    const isAuroraMesh = !isFluidOrbs;

    // Posição do mouse
    const mouse = {
      x: -9999,
      y: -9999,
      active: false,
      radius: isAuroraMesh ? 160 : 220,
    };

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let startTime = Date.now();

    // Paletas temáticas balanceadas e vibrantes
    const getPalette = () => {
      if (isDark) {
        return isAuroraMesh
          ? ["#818CF8", "#6366F1", "#A855F7", "#38BDF8", "#00F0FF"]
          : ["#C084FC", "#9333EA", "#E879F9", "#FB7185", "#A855F7"];
      } else {
        return isAuroraMesh
          ? ["#6366F1", "#4F46E5", "#7C3AED", "#0284C7", "#06B6D4"]
          : ["#9333EA", "#C084FC", "#F472B6", "#EC4899", "#A855F7"];
      }
    };

    // Ajuste de DPI e Redimensionamento com detecção segura de dimensões
    const resize = () => {
      if (!canvas) return;
      let targetWidth = 0;
      let targetHeight = 0;

      if (previewContainerRef?.current) {
        const rect = previewContainerRef.current.getBoundingClientRect();
        targetWidth = rect.width;
        targetHeight = rect.height;
      } else if (canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        targetWidth = rect.width;
        targetHeight = rect.height;
      }

      if (!targetWidth || targetWidth < 50) {
        targetWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
      }
      if (!targetHeight || targetHeight < 50) {
        targetHeight = typeof window !== "undefined" ? window.innerHeight : 800;
      }

      width = Math.floor(targetWidth);
      height = Math.floor(targetHeight);

      const dpr = Math.min(
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
        2
      );
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
      ctx.scale(dpr, dpr);

      initParticles();
    };

    // Inicialização das partículas com escala visual apropriada
    const initParticles = () => {
      particles = [];
      const palette = getPalette();
      const speedMultiplier = prefersReducedMotion ? 0.08 : 0.65;
      const isMobile = width < 768;

      if (isAuroraMesh) {
        // Modo Malha Aurora: nós de rede conectados + fundo fluido
        const count = isMobile ? 24 : 45;
        for (let i = 0; i < count; i++) {
          const radius = Math.random() * 2.2 + 1.4;
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * speedMultiplier,
            vy: (Math.random() - 0.5) * speedMultiplier,
            radius,
            baseRadius: radius,
            color: palette[Math.floor(Math.random() * palette.length)],
            alpha: isDark
              ? Math.random() * 0.45 + 0.35
              : Math.random() * 0.4 + 0.25,
          });
        }
      } else {
        // Modo Fluid Orbs: Grandes esferas de luz com gaussian blur flutuante
        const count = isMobile ? 7 : 12;
        for (let i = 0; i < count; i++) {
          const radius = isMobile
            ? Math.random() * 60 + 60 // 60px a 120px no mobile
            : Math.random() * 110 + 90; // 90px a 200px no desktop

          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * (speedMultiplier * 0.55),
            vy: (Math.random() - 0.5) * (speedMultiplier * 0.55),
            radius,
            baseRadius: radius,
            color: palette[Math.floor(Math.random() * palette.length)],
            alpha: isDark
              ? Math.random() * 0.25 + 0.18
              : Math.random() * 0.22 + 0.14,
          });
        }
      }
    };

    // Rastreamento do mouse
    const handleMouseMove = (e: MouseEvent) => {
      if (previewContainerRef?.current) {
        const rect = previewContainerRef.current.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active =
          mouse.x >= 0 &&
          mouse.x <= rect.width &&
          mouse.y >= 0 &&
          mouse.y <= rect.height;
      } else {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === "visible";
      if (isVisible) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    // Renderização do Tema Aurora Mesh: Fundo orgânico + Constelação de Nós Reativos
    const renderAuroraMesh = (time: number) => {
      // 1. Manchas orgânicas da Aurora no fundo do canvas
      const t = time * 0.0006;
      const spot1X = width * 0.3 + Math.sin(t) * (width * 0.15);
      const spot1Y = height * 0.35 + Math.cos(t * 0.8) * (height * 0.15);
      const spot1Radius = Math.max(width, height) * 0.5;

      const grad1 = ctx.createRadialGradient(
        spot1X,
        spot1Y,
        0,
        spot1X,
        spot1Y,
        spot1Radius
      );
      grad1.addColorStop(
        0,
        isDark ? "rgba(99, 102, 241, 0.18)" : "rgba(99, 102, 241, 0.12)"
      );
      grad1.addColorStop(
        0.5,
        isDark ? "rgba(168, 85, 247, 0.08)" : "rgba(124, 58, 237, 0.06)"
      );
      grad1.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.beginPath();
      ctx.arc(spot1X, spot1Y, spot1Radius, 0, Math.PI * 2);
      ctx.fillStyle = grad1;
      ctx.fill();

      const spot2X = width * 0.75 + Math.cos(t * 0.7) * (width * 0.15);
      const spot2Y = height * 0.65 + Math.sin(t * 0.9) * (height * 0.15);
      const spot2Radius = Math.max(width, height) * 0.45;

      const grad2 = ctx.createRadialGradient(
        spot2X,
        spot2Y,
        0,
        spot2X,
        spot2Y,
        spot2Radius
      );
      grad2.addColorStop(
        0,
        isDark ? "rgba(56, 189, 248, 0.15)" : "rgba(6, 182, 212, 0.1)"
      );
      grad2.addColorStop(
        0.5,
        isDark ? "rgba(99, 102, 241, 0.06)" : "rgba(79, 70, 229, 0.04)"
      );
      grad2.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.beginPath();
      ctx.arc(spot2X, spot2Y, spot2Radius, 0, Math.PI * 2);
      ctx.fillStyle = grad2;
      ctx.fill();

      // 2. Conexões entre partículas (Mesh / Plexus)
      const maxDistance = width < 768 ? 95 : 135;
      const mouseMaxDistance = 150;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha =
              (1 - dist / maxDistance) * (isDark ? 0.35 : 0.22);
            ctx.beginPath();
            ctx.strokeStyle = isDark
              ? `rgba(168, 85, 247, ${lineAlpha})`
              : `rgba(99, 102, 241, ${lineAlpha})`;
            ctx.lineWidth = isDark ? 0.85 : 0.7;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }

        // Interação com o Cursor
        if (mouse.active) {
          const dx = mouse.x - particles[i].x;
          const dy = mouse.y - particles[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseMaxDistance) {
            const mouseLineAlpha =
              (1 - dist / mouseMaxDistance) * (isDark ? 0.75 : 0.45);
            ctx.beginPath();
            ctx.strokeStyle = isDark
              ? `rgba(56, 189, 248, ${mouseLineAlpha})`
              : `rgba(124, 58, 237, ${mouseLineAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();

            // Puxão magnético sutil
            particles[i].x += dx * 0.007;
            particles[i].y += dy * 0.007;
          }
        }

        // Desenho dos nós luminosos
        ctx.beginPath();
        ctx.arc(
          particles[i].x,
          particles[i].y,
          particles[i].radius,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = particles[i].color;
        ctx.globalAlpha = particles[i].alpha;
        ctx.fill();

        if (isDark) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = particles[i].color;
        }
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Glow sob o cursor
      if (mouse.active) {
        const glowRadius = 50;
        const radialGlow = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          glowRadius
        );
        radialGlow.addColorStop(
          0,
          isDark ? "rgba(99, 102, 241, 0.4)" : "rgba(79, 70, 229, 0.25)"
        );
        radialGlow.addColorStop(1, "rgba(99, 102, 241, 0)");

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = radialGlow;
        ctx.fill();
      }
    };

    // Renderização do Tema Fluid Orbs: Grandes esferas fluidas com Gaussian Blur
    const renderFluidOrbs = () => {
      const hasFilterSupport = typeof ctx.filter === "string";
      if (hasFilterSupport) {
        ctx.filter = "blur(22px)";
      }

      // Spotlight fluido no cursor
      if (mouse.active) {
        const spotRadius = width < 768 ? 160 : 260;
        const spotlight = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          spotRadius
        );
        spotlight.addColorStop(
          0,
          isDark ? "rgba(232, 121, 249, 0.28)" : "rgba(244, 114, 182, 0.24)"
        );
        spotlight.addColorStop(
          0.5,
          isDark ? "rgba(147, 51, 234, 0.12)" : "rgba(168, 85, 247, 0.1)"
        );
        spotlight.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, spotRadius, 0, Math.PI * 2);
        ctx.fillStyle = spotlight;
        ctx.fill();
      }

      // Renderiza grandes esferas fluidas com amortecimento
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Repulsão suave com o cursor
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pushRadius = p.radius + 60;

          if (dist < pushRadius && dist > 1) {
            const force = (1 - dist / pushRadius) * 1.5;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
            p.radius = p.baseRadius * 1.15;
          } else {
            p.radius = p.radius + (p.baseRadius - p.radius) * 0.04;
          }
        }

        // Gradiente radial fluido da esfera
        const grad = ctx.createRadialGradient(
          p.x - p.radius * 0.15,
          p.y - p.radius * 0.15,
          p.radius * 0.05,
          p.x,
          p.y,
          p.radius
        );

        grad.addColorStop(0, p.color);
        grad.addColorStop(0.6, p.color);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }

      if (hasFilterSupport) {
        ctx.filter = "none";
      }
      ctx.globalAlpha = 1;
    };

    // Loop Principal de Animação (60 FPS)
    const render = () => {
      if (!isVisible) return;

      try {
        ctx.clearRect(0, 0, width, height);
        const now = Date.now() - startTime;

        // Atualização da física das partículas
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;

          // Rebote suave com margem de segurança
          if (p.x < -p.radius * 0.2) {
            p.x = -p.radius * 0.2;
            p.vx = Math.abs(p.vx);
          } else if (p.x > width + p.radius * 0.2) {
            p.x = width + p.radius * 0.2;
            p.vx = -Math.abs(p.vx);
          }

          if (p.y < -p.radius * 0.2) {
            p.y = -p.radius * 0.2;
            p.vy = Math.abs(p.vy);
          } else if (p.y > height + p.radius * 0.2) {
            p.y = height + p.radius * 0.2;
            p.vy = -Math.abs(p.vy);
          }
        }

        if (isAuroraMesh) {
          renderAuroraMesh(now);
        } else {
          renderFluidOrbs();
        }
      } catch (err) {
        console.error("DynamicCanvasBackground render error:", err);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // Inicialização
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [style, isDark, previewContainerRef]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none transition-opacity duration-500 ${className}`}
      style={{ display: "block" }}
      aria-hidden="true"
    />
  );
}
