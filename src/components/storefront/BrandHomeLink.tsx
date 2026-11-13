"use client";

import React, { useRef } from "react";
import Link from "next/link";

interface BrandHomeLinkProps {
  className?: string;
  textSizeClass?: string;
  onNavigate?: () => void;
}

/**
 * Wordmark oficial PopShake com suporte a seleção/cópia de texto ao arrastar o mouse,
 * preservando a navegação para a página inicial no clique simples.
 */
export function BrandHomeLink({
  className = "",
  textSizeClass = "text-2xl",
  onNavigate,
}: BrandHomeLinkProps) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressedClickRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLAnchorElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    suppressedClickRef.current = false;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;

    const movedDistance = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    const hasSelectedText =
      typeof window !== "undefined" &&
      Boolean(window.getSelection()?.toString().trim().length);

    if (movedDistance > 4 && hasSelectedText) {
      suppressedClickRef.current = true;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (suppressedClickRef.current) {
      e.preventDefault();
      suppressedClickRef.current = false;
      return;
    }
    onNavigate?.();
  };

  return (
    <Link
      href="/"
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      className={`flex items-center select-text [-webkit-user-drag:none] cursor-pointer hover:opacity-85 transition-opacity duration-200 shrink-0 ${className}`.trim()}
      aria-label="Pop Shake — Início"
    >
      <span
        className={`font-heading font-black ${textSizeClass} tracking-tight flex items-center shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] select-text`.trim()}
      >
        <span className="text-zinc-900 dark:text-white transition-colors">Pop</span>
        <span className="text-primary dark:text-violet-400 transition-colors">Shake</span>
      </span>
    </Link>
  );
}
