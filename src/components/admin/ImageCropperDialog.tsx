"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getCroppedImg } from "../../lib/cropImage";
import {
  CropHandle,
  FULL_IMAGE_RECT,
  NormalizedRect,
  clampPanOffset,
  computePixelCropFromFreeRect,
  resizeFreeCropRect,
} from "../../lib/freeCropMath";
import { Button } from "../ui/button";
import {
  ZoomIn,
  Crop,
  AlertCircle,
  Check,
  X,
  Loader2,
  RotateCcw,
  RotateCw,
  RefreshCcw,
  Move,
} from "lucide-react";

export const IMAGE_CROPPER_DIALOG_CONTENT_CLASS =
  "z-[95] flex flex-col gap-4 w-[calc(100vw-1.5rem)] max-w-[680px] sm:max-w-[680px] max-h-[92vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6 bg-background/95 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl";

interface ImageCropperDialogProps {
  open: boolean;
  imageSrc: string | null;
  aspectRatio?: number;
  aspectLabel: string; // Exibido apenas como recomendação de tamanho/proporção
  maxDimension?: number;
  onCropComplete: (file: File) => void;
  onCancel: () => void;
}

const HANDLES: Array<{
  id: Exclude<CropHandle, "move">;
  positionClass: string;
  cursorClass: string;
}> = [
  { id: "nw", positionClass: "-top-1.5 -left-1.5", cursorClass: "cursor-nwse-resize" },
  { id: "n", positionClass: "-top-1.5 left-1/2 -translate-x-1/2", cursorClass: "cursor-ns-resize" },
  { id: "ne", positionClass: "-top-1.5 -right-1.5", cursorClass: "cursor-nesw-resize" },
  { id: "e", positionClass: "top-1/2 -right-1.5 -translate-y-1/2", cursorClass: "cursor-ew-resize" },
  { id: "se", positionClass: "-bottom-1.5 -right-1.5", cursorClass: "cursor-nwse-resize" },
  { id: "s", positionClass: "-bottom-1.5 left-1/2 -translate-x-1/2", cursorClass: "cursor-ns-resize" },
  { id: "sw", positionClass: "-bottom-1.5 -left-1.5", cursorClass: "cursor-nesw-resize" },
  { id: "w", positionClass: "top-1/2 -left-1.5 -translate-y-1/2", cursorClass: "cursor-ew-resize" },
];

async function createRotatedPreviewUrl(sourceUrl: string, rotationDeg: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const normalizedRot = ((rotationDeg % 360) + 360) % 360;
      if (normalizedRot === 0) {
        resolve(sourceUrl);
        return;
      }
      const rotRad = (normalizedRot * Math.PI) / 180;
      const bBoxW = Math.max(
        1,
        Math.round(Math.abs(Math.cos(rotRad) * img.width) + Math.abs(Math.sin(rotRad) * img.height))
      );
      const bBoxH = Math.max(
        1,
        Math.round(Math.abs(Math.sin(rotRad) * img.width) + Math.abs(Math.cos(rotRad) * img.height))
      );

      const canvas = document.createElement("canvas");
      canvas.width = bBoxW;
      canvas.height = bBoxH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Contexto 2D indisponível."));
        return;
      }

      ctx.translate(bBoxW / 2, bBoxH / 2);
      ctx.rotate(rotRad);
      ctx.translate(-img.width / 2, -img.height / 2);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Falha ao girar visualização da imagem."));
            return;
          }
          resolve(URL.createObjectURL(blob));
        },
        "image/png",
        1
      );
    };
    img.onerror = () => reject(new Error("Falha ao carregar imagem para rotação."));
    img.src = sourceUrl;
  });
}

export function ImageCropperDialog({
  open,
  imageSrc,
  aspectLabel,
  maxDimension = 1024,
  onCropComplete,
  onCancel,
}: ImageCropperDialogProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [stageBounds, setStageBounds] = useState<{ width: number; height: number }>({
    width: 560,
    height: 320,
  });

  const [cropRect, setCropRect] = useState<NormalizedRect>(FULL_IMAGE_RECT);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isHoveringCrop, setIsHoveringCrop] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const rotatedBlobUrlRef = useRef<string | null>(null);
  const fetchedBlobUrlRef = useRef<string | null>(null);

  const cleanupRotatedBlob = () => {
    if (rotatedBlobUrlRef.current) {
      URL.revokeObjectURL(rotatedBlobUrlRef.current);
      rotatedBlobUrlRef.current = null;
    }
  };

  const cleanupFetchedBlob = () => {
    if (fetchedBlobUrlRef.current) {
      URL.revokeObjectURL(fetchedBlobUrlRef.current);
      fetchedBlobUrlRef.current = null;
    }
  };

  // Carrega imagem de origem (inclusive URLs já enviadas no servidor) sem taint CORS
  useEffect(() => {
    if (!open || !imageSrc) {
      setResolvedSrc(null);
      setDisplaySrc(null);
      setNaturalSize(null);
      cleanupRotatedBlob();
      cleanupFetchedBlob();
      return;
    }

    let cancelled = false;
    setCropRect(FULL_IMAGE_RECT);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setCropError(null);
    setNaturalSize(null);
    cleanupRotatedBlob();
    cleanupFetchedBlob();

    const loadSource = async () => {
      if (imageSrc.startsWith("data:") || imageSrc.startsWith("blob:")) {
        setResolvedSrc(imageSrc);
        setDisplaySrc(imageSrc);
        return;
      }

      setLoadingPreview(true);
      try {
        const res = await fetch(imageSrc, { cache: "no-store" });
        if (!res.ok) throw new Error("Falha HTTP ao baixar imagem.");
        const blob = await res.blob();
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        fetchedBlobUrlRef.current = blobUrl;
        setResolvedSrc(blobUrl);
        setDisplaySrc(blobUrl);
      } catch {
        if (cancelled) return;
        setResolvedSrc(imageSrc);
        setDisplaySrc(imageSrc);
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };

    loadSource();

    return () => {
      cancelled = true;
    };
  }, [open, imageSrc]);

  useEffect(() => {
    return () => {
      cleanupRotatedBlob();
      cleanupFetchedBlob();
    };
  }, []);

  // Mede o espaço disponível do palco de edição para exibir a imagem inteira sem cortes
  useEffect(() => {
    if (!open) return;
    const el = stageContainerRef.current;
    if (!el) return;

    const updateBounds = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageBounds({
          width: Math.max(180, Math.floor(rect.width - 24)),
          height: Math.max(180, Math.floor(rect.height - 24)),
        });
      }
    };

    updateBounds();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateBounds);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, [open]);

  // Tecla Escape para fechar
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !processing) {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, processing, onCancel]);

  const handleRotate = async (delta: number) => {
    if (!resolvedSrc || loadingPreview) return;
    const nextRotation = (rotation + delta + 360) % 360;
    setRotation(nextRotation);
    setCropRect(FULL_IMAGE_RECT);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setCropError(null);

    if (nextRotation === 0) {
      cleanupRotatedBlob();
      setDisplaySrc(resolvedSrc);
      return;
    }

    setLoadingPreview(true);
    try {
      const rotatedUrl = await createRotatedPreviewUrl(resolvedSrc, nextRotation);
      cleanupRotatedBlob();
      if (rotatedUrl !== resolvedSrc) {
        rotatedBlobUrlRef.current = rotatedUrl;
      }
      setDisplaySrc(rotatedUrl);
    } catch (err) {
      console.error("Erro ao rotacionar imagem:", err);
      setCropError("Não foi possível girar esta imagem no navegador.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleResetOriginal = () => {
    cleanupRotatedBlob();
    setRotation(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCropRect(FULL_IMAGE_RECT);
    setCropError(null);
    if (resolvedSrc) {
      setDisplaySrc(resolvedSrc);
    }
  };

  const handleZoomSliderChange = (nextZoomValue: number) => {
    setZoom(nextZoomValue);
    setPan((prev) => clampPanOffset(prev.x, prev.y, nextZoomValue));
  };

  // Calcula tamanho exato do quadro para mostrar 100% da imagem na proporção original
  const frameSize = (() => {
    if (!naturalSize) {
      return { width: stageBounds.width, height: stageBounds.height };
    }
    const scale = Math.min(
      stageBounds.width / naturalSize.width,
      stageBounds.height / naturalSize.height
    );
    return {
      width: Math.max(80, Math.round(naturalSize.width * scale)),
      height: Math.max(80, Math.round(naturalSize.height * scale)),
    };
  })();

  const dragSessionRef = useRef<{
    type: "handle" | "pan";
    handle?: CropHandle;
    startX: number;
    startY: number;
    startRect: NormalizedRect;
    startPan: { x: number; y: number };
  } | null>(null);

  const startDrag = useCallback(
    (
      e: React.PointerEvent,
      action: CropHandle
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const isFullRect =
        cropRect.width >= 0.995 && cropRect.height >= 0.995;

      dragSessionRef.current = {
        type: action === "move" && zoom > 1 && isFullRect ? "pan" : "handle",
        handle: action,
        startX: e.clientX,
        startY: e.clientY,
        startRect: cropRect,
        startPan: pan,
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        const session = dragSessionRef.current;
        if (!session) return;
        const deltaX = (moveEvent.clientX - session.startX) / Math.max(1, frameSize.width);
        const deltaY = (moveEvent.clientY - session.startY) / Math.max(1, frameSize.height);

        if (session.type === "pan") {
          setPan(
            clampPanOffset(
              session.startPan.x + deltaX,
              session.startPan.y + deltaY,
              zoom
            )
          );
        } else if (session.handle) {
          setCropRect(
            resizeFreeCropRect(session.startRect, session.handle, deltaX, deltaY)
          );
        }
      };

      const onPointerUp = () => {
        dragSessionRef.current = null;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [cropRect, pan, zoom, frameSize.width, frameSize.height]
  );

  const outputPreviewPixels = naturalSize
    ? computePixelCropFromFreeRect(
        cropRect,
        naturalSize.width,
        naturalSize.height,
        zoom,
        pan.x,
        pan.y
      )
    : null;

  const handleConfirmCrop = async () => {
    if (!displaySrc || !naturalSize) return;

    setProcessing(true);
    setCropError(null);
    try {
      const pixelCrop = computePixelCropFromFreeRect(
        cropRect,
        naturalSize.width,
        naturalSize.height,
        zoom,
        pan.x,
        pan.y
      );
      const croppedFile = await getCroppedImg(displaySrc, pixelCrop, "popshake-crop.webp", {
        rotation: 0,
        maxDimension,
      });
      onCropComplete(croppedFile);
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      setCropError(
        "Não foi possível processar esta imagem. Tente escolher o arquivo novamente."
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!open || !imageSrc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editar, recortar e enquadrar imagem"
      className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !processing && onCancel()}
    >
      <div
        className={IMAGE_CROPPER_DIALOG_CONTENT_CLASS}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Crop className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-heading text-lg sm:text-xl font-bold tracking-tight leading-snug text-foreground break-words">
                Editar e recortar imagem
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Começa no tamanho original. Ajuste apenas se desejar.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={processing}
            onClick={onCancel}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer shrink-0"
            aria-label="Fechar editor de imagem"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Texto informativo de recomendação (sem travar tamanho) */}
        <div className="w-full min-w-0 bg-primary/8 border border-primary/20 rounded-2xl p-3.5 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-foreground break-words">
              <strong>Recomendação para este espaço:</strong>{" "}
              <span className="text-primary font-bold">{aspectLabel}</span>
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed break-words">
              Recorte livre (sem proporção travada): passe o mouse no quadro, arraste as bordas ou cantos ou use o zoom abaixo. Conversão automática para WebP.
            </p>
          </div>
        </div>

        {cropError && (
          <div
            role="alert"
            className="w-full min-w-0 bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-3 text-xs font-medium flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="break-words">{cropError}</span>
          </div>
        )}

        {/* Palco da Imagem Original + Caixa Livre de Recorte */}
        <div
          ref={stageContainerRef}
          className="relative w-full min-w-0 h-[270px] sm:h-[340px] bg-zinc-950 border border-border/60 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center p-3 select-none"
        >
          {loadingPreview || !displaySrc ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Carregando imagem original...</span>
            </div>
          ) : (
            <div
              className="relative overflow-hidden shadow-md bg-black/40 touch-none"
              style={{ width: frameSize.width, height: frameSize.height }}
              onMouseEnter={() => setIsHoveringCrop(true)}
              onMouseLeave={() => setIsHoveringCrop(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displaySrc}
                alt="Pré-visualização para recorte"
                draggable={false}
                onLoad={(e) => {
                  const target = e.currentTarget;
                  if (target.naturalWidth > 0 && target.naturalHeight > 0) {
                    setNaturalSize({
                      width: target.naturalWidth,
                      height: target.naturalHeight,
                    });
                  }
                }}
                className="w-full h-full object-contain pointer-events-none select-none"
                style={{
                  transform: `translate(${pan.x * 100}%, ${pan.y * 100}%) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
              />

              {/* Caixa interativa de recorte livre (cobre 100% da imagem ao abrir) */}
              <div
                onPointerDown={(e) => startDrag(e, "move")}
                className={`absolute border-2 transition-colors ${
                  isHoveringCrop ? "border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.52)]" : "border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.52)]"
                } cursor-grab active:cursor-grabbing`}
                style={{
                  left: `${cropRect.x * 100}%`,
                  top: `${cropRect.y * 100}%`,
                  width: `${cropRect.width * 100}%`,
                  height: `${cropRect.height * 100}%`,
                }}
                title="Arraste para mover ou use os pontos nas bordas/cantos para recortar"
              >
                {/* Linhas guia sutis (regra dos terços) ao passar o mouse */}
                <div
                  className={`pointer-events-none absolute inset-0 transition-opacity ${
                    isHoveringCrop ? "opacity-55" : "opacity-25"
                  }`}
                >
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/60" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/60" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/60" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white/60" />
                </div>

                {/* Indicador central discreto ao passar o mouse */}
                {isHoveringCrop && (
                  <div className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-semibold flex items-center gap-1">
                    <Move className="w-3 h-3 text-primary" />
                    <span>{zoom > 1 ? "Arraste ou puxe as bordas" : "Puxe as bordas para recortar"}</span>
                  </div>
                )}

                {/* 8 alças livres (cantos e bordas) */}
                {HANDLES.map((handle) => (
                  <div
                    key={handle.id}
                    onPointerDown={(e) => startDrag(e, handle.id)}
                    className={`absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-primary shadow-md z-10 hover:scale-125 transition-transform touch-none ${handle.positionClass} ${handle.cursorClass}`}
                    title="Arraste para redimensionar livremente"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controles de Zoom, Rotação e Restaurar */}
        <div className="w-full min-w-0 flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/40 border border-border/50 rounded-2xl p-3.5">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <ZoomIn className="w-4 h-4 text-primary shrink-0" />
            <label
              htmlFor="image-cropper-zoom"
              className="text-xs font-semibold text-muted-foreground shrink-0"
            >
              Zoom
            </label>
            <input
              id="image-cropper-zoom"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => handleZoomSliderChange(parseFloat(e.target.value))}
              className="flex-1 min-w-0 accent-primary cursor-pointer"
            />
            <span className="text-xs text-primary font-bold tabular-nums w-11 shrink-0 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <div className="flex items-center justify-end gap-1.5 flex-wrap shrink-0 border-t sm:border-t-0 sm:border-l border-border/60 pt-2 sm:pt-0 sm:pl-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingPreview}
              onClick={() => handleRotate(-90)}
              title="Girar 90° para a esquerda"
              className="h-8 px-2.5 rounded-xl text-[11px] font-semibold gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              -90°
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingPreview}
              onClick={() => handleRotate(90)}
              title="Girar 90° para a direita"
              className="h-8 px-2.5 rounded-xl text-[11px] font-semibold gap-1 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              +90°
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingPreview}
              onClick={handleResetOriginal}
              title="Voltar para a imagem original inteira"
              className="h-8 px-2.5 rounded-xl text-[11px] font-semibold gap-1 cursor-pointer"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Original
            </Button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="w-full min-w-0 pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span className="text-[11px] text-muted-foreground font-mono">
            {outputPreviewPixels
              ? `Seleção atual: ${outputPreviewPixels.width} × ${outputPreviewPixels.height} px`
              : "Aguardando carregamento..."}
          </span>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={processing}
              className="rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 h-10 px-4 w-full sm:w-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCrop}
              disabled={processing || loadingPreview || !naturalSize}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 h-10 px-6 w-full sm:w-auto shadow-md cursor-pointer"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmar recorte</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
