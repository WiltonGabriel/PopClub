"use client";

import React, { useEffect, useRef } from "react";

export interface DynamicCanvasBackgroundProps {
  style?: "constellation" | "aurora_orbs" | "noctalia_mesh" | "aurora_mesh" | "fluid_orbs";
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
  style = "constellation",
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

    const isConstellationMesh =
      style === "constellation" || style === "noctalia_mesh" || style === "aurora_mesh";

    // Posição do mouse
    const mouse = {
      x: -9999,
      y: -9999,
      active: false,
      radius: isConstellationMesh ? 140 : 180,
    };

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];

    // Ajuste de DPI e Redimensionamento
    const resize = () => {
      if (!canvas) return;
      const target = previewContainerRef?.current || canvas.parentElement || window;
      const rect =
        target instanceof HTMLElement
          ? target.getBoundingClientRect()
          : { width: window.innerWidth, height: window.innerHeight };

      width = Math.max(10, rect.width);
      height = Math.max(10, rect.height);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
      ctx.scale(dpr, dpr);

      initParticles();
    };

    // Paletas temáticas para o Canvas
    const getPalette = () => {
      if (isDark) {
        return isConstellationMesh
          ? ["#818CF8", "#6366F1", "#A855F7", "#38BDF8", "#00F0FF"]
          : ["#C084FC", "#9333EA", "#F472B6", "#FB7185", "#E899FF"];
      } else {
        return isConstellationMesh
          ? ["#6366F1", "#4F46E5", "#7C3AED", "#0284C7", "#06B6D4"]
          : ["#9333EA", "#C084FC", "#EC4899", "#F43F5E", "#A855F7"];
      }
    };

    // Inicialização das partículas (otimizado para 60 FPS)
    const initParticles = () => {
      particles = [];
      const isMobile = width < 768;
      const count = isMobile
        ? isConstellationMesh ? 24 : 16
        : isConstellationMesh ? 50 : 30;

      const palette = getPalette();
      const speedMultiplier = prefersReducedMotion ? 0.08 : 0.65;

      for (let i = 0; i < count; i++) {
        const radius =
          isConstellationMesh
            ? Math.random() * 2 + 1.2
            : Math.random() * 16 + 12;

        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speedMultiplier,
          vy: (Math.random() - 0.5) * speedMultiplier,
          radius,
          baseRadius: radius,
          color: palette[Math.floor(Math.random() * palette.length)],
          alpha:
            isConstellationMesh
              ? isDark ? Math.random() * 0.5 + 0.35 : Math.random() * 0.4 + 0.25
              : isDark ? Math.random() * 0.35 + 0.15 : Math.random() * 0.25 + 0.1,
        });
      }
    };

    // Listeners de mouse
    const handleMouseMove = (e: MouseEvent) => {
      if (previewContainerRef?.current) {
        const rect = previewContainerRef.current.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active =
          mouse.x >= 0 && mouse.x <= rect.width && mouse.y >= 0 && mouse.y <= rect.height;
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

    // Renderização do Tema 1: "Malha Constelação Neon" (Plexus)
    const renderConstellation = () => {
      const maxDistance = width < 768 ? 90 : 125;
      const mouseMaxDistance = 140;

      // 1. Conexões entre partículas
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * (isDark ? 0.35 : 0.22);
            ctx.beginPath();
            ctx.strokeStyle = isDark
              ? `rgba(232, 153, 255, ${lineAlpha})`
              : `rgba(147, 6, 207, ${lineAlpha})`;
            ctx.lineWidth = isDark ? 0.8 : 0.65;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }

        // 2. Interação com o Cursor do Mouse (conexão magnética)
        if (mouse.active) {
          const dx = mouse.x - particles[i].x;
          const dy = mouse.y - particles[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseMaxDistance) {
            const mouseLineAlpha = (1 - dist / mouseMaxDistance) * (isDark ? 0.75 : 0.45);
            ctx.beginPath();
            ctx.strokeStyle = isDark
              ? `rgba(255, 0, 122, ${mouseLineAlpha})`
              : `rgba(148, 0, 104, ${mouseLineAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();

            // Puxão magnético sutil
            particles[i].x += dx * 0.008;
            particles[i].y += dy * 0.008;
          }
        }

        // 3. Desenho do nó (partícula)
        ctx.beginPath();
        ctx.arc(particles[i].x, particles[i].y, particles[i].radius, 0, Math.PI * 2);
        ctx.fillStyle = particles[i].color;
        ctx.globalAlpha = particles[i].alpha;
        ctx.fill();

        // Brilho suave no nó
        if (isDark) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = particles[i].color;
        }
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // 4. Feixe de luz sob o cursor
      if (mouse.active) {
        const glowRadius = 45;
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
          isDark ? "rgba(255, 0, 122, 0.45)" : "rgba(147, 6, 207, 0.25)"
        );
        radialGlow.addColorStop(1, "rgba(147, 6, 207, 0)");

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = radialGlow;
        ctx.fill();
      }
    };

    // Renderização do Tema 2: "Aurora & Orbs Cremosos" (Spotlight Fluido)
    const renderAuroraOrbs = () => {
      // 1. Efeito Spotlight no Cursor
      if (mouse.active) {
        const spotRadius = width < 768 ? 130 : 200;
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
          isDark ? "rgba(232, 153, 255, 0.22)" : "rgba(255, 112, 166, 0.2)"
        );
        spotlight.addColorStop(
          0.5,
          isDark ? "rgba(147, 6, 207, 0.1)" : "rgba(147, 6, 207, 0.08)"
        );
        spotlight.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, spotRadius, 0, Math.PI * 2);
        ctx.fillStyle = spotlight;
        ctx.fill();
      }

      // 2. Orbs Fluidos com física amortecida
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Se o mouse estiver próximo, empurra a partícula suavemente para fora
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pushRadius = 140;

          if (dist < pushRadius && dist > 1) {
            const force = (1 - dist / pushRadius) * 1.8;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
            p.radius = p.baseRadius * 1.25;
          } else {
            p.radius = p.radius + (p.baseRadius - p.radius) * 0.05;
          }
        }

        // Desenha esfera translúcida cremosa
        const grad = ctx.createRadialGradient(
          p.x - p.radius * 0.3,
          p.y - p.radius * 0.3,
          p.radius * 0.1,
          p.x,
          p.y,
          p.radius
        );

        grad.addColorStop(0, p.color);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    // Loop Principal de Animação
    const render = () => {
      if (!isVisible) return;

      ctx.clearRect(0, 0, width, height);

      // Atualiza posição das partículas
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Rebote nas bordas
        if (p.x < 0) {
          p.x = 0;
          p.vx = -p.vx;
        } else if (p.x > width) {
          p.x = width;
          p.vx = -p.vx;
        }

        if (p.y < 0) {
          p.y = 0;
          p.vy = -p.vy;
        } else if (p.y > height) {
          p.y = height;
          p.vy = -p.vy;
        }
      }

      if (isConstellationMesh) {
        renderConstellation();
      } else {
        renderAuroraOrbs();
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
