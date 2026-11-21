"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { storeSettingsService } from "../../services/storeSettingsService";

export function DraggableWhatsAppButton() {
  const [whatsappUrl, setWhatsappUrl] = useState(
    "https://wa.me/5565999999999?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20os%20pedidos%20da%20Pop%20Shake%20Sorveteria."
  );
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dockSide, setDockSide] = useState<"left" | "right">("right");
  const [isMounted, setIsMounted] = useState(false);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    pointerId: number | null;
  }>({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    pointerId: null,
  });

  const hasDraggedRef = useRef(false);

  // Carrega configurações de atendimento via WhatsApp
  useEffect(() => {
    storeSettingsService
      .getSettings()
      .then((settings) => {
        const rawNumber = settings.whatsappNumber || "5565999999999";
        const cleanNumber = rawNumber.replace(/\D/g, "");
        const rawMessage =
          settings.whatsappMessage ||
          "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria.";
        const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(rawMessage)}`;
        setWhatsappUrl(url);
      })
      .catch((err) => console.error("Erro ao carregar link de WhatsApp:", err));
  }, []);

  // Inicializa posição segura acima do carrinho (bottom-28 right-4) e escuta resize
  const getBtnSize = () => (typeof window !== "undefined" && window.innerWidth < 640 ? 48 : 56);

  useEffect(() => {
    setIsMounted(true);
    const btnSize = getBtnSize();
    const marginSide = 16;
    const marginBottom = 112; // 28 * 4 = 112px (acima da barra do carrinho)

    const initialX = Math.max(marginSide, window.innerWidth - btnSize - marginSide);
    const initialY = Math.max(80, window.innerHeight - btnSize - marginBottom);

    setPosition({ x: initialX, y: initialY });
    setDockSide("right");

    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        const currentBtnSize = getBtnSize();
        const screenMid = window.innerWidth / 2;
        const snapRight = prev.x >= screenMid;
        const clampedX = snapRight ? window.innerWidth - currentBtnSize - marginSide : marginSide;
        const maxY = window.innerHeight - currentBtnSize - 80;
        const clampedY = Math.min(Math.max(64, prev.y), maxY);
        setDockSide(snapRight ? "right" : "left");
        return { x: clampedX, y: clampedY };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Permite toque ou botão esquerdo do mouse
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const btnSize = getBtnSize();
    hasDraggedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position?.x ?? (window.innerWidth - btnSize - 16),
      initialPosY: position?.y ?? (window.innerHeight - btnSize - 112),
      pointerId: e.pointerId,
    };

    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignora caso pointer capture não seja suportado
    }
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    const dist = Math.hypot(deltaX, deltaY);

    // Se moveu mais de 6px, consideramos um arrasto ativo (não um toque de abertura)
    if (dist > 6) {
      hasDraggedRef.current = true;
    }

    const btnSize = getBtnSize();
    const rawX = dragStartRef.current.initialPosX + deltaX;
    const rawY = dragStartRef.current.initialPosY + deltaY;

    // Delimitações para não sair da tela ou cobrir o topo
    const minX = 8;
    const maxX = window.innerWidth - btnSize - 8;
    const minY = 64; // Abaixo da barra de cabeçalho
    const maxY = window.innerHeight - btnSize - 76; // Acima da bottom navigation

    const clampedX = Math.min(Math.max(minX, rawX), maxX);
    const clampedY = Math.min(Math.max(minY, rawY), maxY);

    setPosition({ x: clampedX, y: clampedY });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      if (dragStartRef.current.pointerId !== null) {
        e.currentTarget.releasePointerCapture(dragStartRef.current.pointerId);
      }
    } catch {
      // Ignora erro de release
    }

    const btnSize = getBtnSize();
    const marginSide = 16;
    const currentX = position?.x ?? (window.innerWidth - btnSize - marginSide);
    const currentY = position?.y ?? (window.innerHeight - btnSize - 112);

    // Docking / Snap suave para a lateral mais próxima
    const screenMid = window.innerWidth / 2;
    const snapToRight = currentX >= screenMid;
    const snappedX = snapToRight ? window.innerWidth - btnSize - marginSide : marginSide;

    const minY = 64;
    const maxY = window.innerHeight - btnSize - 80;
    const snappedY = Math.min(Math.max(minY, currentY), maxY);

    setDockSide(snapToRight ? "right" : "left");
    setPosition({ x: snappedX, y: snappedY });

    if (hasDraggedRef.current) {
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 200);
    }
  }, [isDragging, position]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      if (dragStartRef.current.pointerId !== null) {
        e.currentTarget.releasePointerCapture(dragStartRef.current.pointerId);
      }
    } catch {
      // Ignora erro
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Abre WhatsApp somente em cliques/toques rápidos
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  if (!isMounted) {
    // Renderização inicial segura sem quebra de SSR
    return (
      <aside
        aria-label="Atendimento via WhatsApp"
        className="fixed bottom-28 right-4 z-50 pointer-events-auto"
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" className="w-6 h-6 sm:w-7 sm:h-7 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Atendimento via WhatsApp (Arrastável)"
      className="fixed z-50 select-none touch-none"
      style={{
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
        transition: isDragging
          ? "none"
          : "left 0.28s cubic-bezier(0.2, 0.9, 0.3, 1), top 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)",
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        className={`relative flex items-center group touch-none select-none ${
          isDragging ? "cursor-grabbing scale-105" : "cursor-grab hover:scale-105 active:scale-95"
        } transition-transform duration-150`}
        title="Toque para abrir ou arraste para reposicionar"
      >
        {/* Tooltip flutuante no desktop (alinha conforme o dockSide para não cortar fora da tela) */}
        <span
          className={`hidden sm:inline-flex absolute ${
            dockSide === "right"
              ? "right-full mr-2 -translate-x-1 group-hover:translate-x-0"
              : "left-full ml-2 translate-x-1 group-hover:translate-x-0"
          } px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#230E26]/95 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap items-center gap-1.5`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Falar no WhatsApp
        </span>

        {/* Botão de Ação */}
        <button
          type="button"
          aria-label="Abrir WhatsApp da Pop Shake Sorveteria"
          className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white shadow-xl hover:shadow-2xl focus:outline-none focus:ring-3 focus:ring-emerald-400"
        >
          {/* Efeito Ping / Onda */}
          <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-40 animate-ping -z-10" />

          {/* SVG WhatsApp Oficial */}
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            stroke="currentColor"
            strokeWidth="0"
            fill="currentColor"
            className="w-6 h-6 sm:w-7 sm:h-7 fill-white pointer-events-none"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
