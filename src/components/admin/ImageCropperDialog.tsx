"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { getCroppedImg } from "../../lib/cropImage";
import { ZoomIn, Crop, AlertCircle, Check, X, Loader2, RotateCcw, RotateCw } from "lucide-react";

export const IMAGE_CROPPER_DIALOG_CONTENT_CLASS =
  "z-[80] flex flex-col gap-4 w-[calc(100vw-1.5rem)] max-w-[680px] sm:max-w-[680px] max-h-[90vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6 bg-background/95 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl";

interface ImageCropperDialogProps {
  open: boolean;
  imageSrc: string | null;
  aspectRatio: number; // ex: 1 / 1 para produtos, 16 / 9 para promoções
  aspectLabel: string; // ex: "1:1 (Quadrado)" ou "16:9 (Banner)"
  maxDimension?: number;
  onCropComplete: (file: File) => void;
  onCancel: () => void;
}

export function ImageCropperDialog({
  open,
  imageSrc,
  aspectRatio,
  aspectLabel,
  maxDimension = 1024,
  onCropComplete,
  onCancel,
}: ImageCropperDialogProps) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
      setCropError(null);
    }
  }, [open, imageSrc]);

  const onCropChange = (newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const handleRotate = (delta: number) => {
    setRotation((prev) => (prev + delta + 360) % 360);
  };

  const handleCropComplete = useCallback((_croppedArea: Area, currentPixels: Area) => {
    setCroppedAreaPixels(currentPixels);
  }, []);

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setProcessing(true);
    setCropError(null);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, "popshake-crop.webp", {
        rotation,
        maxDimension,
      });
      onCropComplete(croppedFile);
    } catch (err) {
      console.error("Erro ao recortar imagem:", err);
      setCropError("Não foi possível processar o recorte da imagem. Tente novamente.");
    } finally {
      setProcessing(false);
    }
  };

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent
        overlayClassName="z-[80] bg-black/70"
        className={IMAGE_CROPPER_DIALOG_CONTENT_CLASS}
      >
        <DialogHeader className="mb-0.5 pr-8 min-w-0">
          <DialogTitle className="font-heading text-lg sm:text-xl font-bold tracking-tight leading-snug flex items-center gap-2.5 text-foreground min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Crop className="w-5 h-5" />
            </span>
            <span className="min-w-0 break-words">Recorte e enquadramento da imagem</span>
          </DialogTitle>
        </DialogHeader>

        {/* Aviso de Proporção e Limites */}
        <div className="w-full min-w-0 bg-primary/8 border border-primary/20 rounded-2xl p-3.5 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-foreground break-words">
              <strong>Proporção recomendada:</strong>{" "}
              <span className="text-primary font-bold">{aspectLabel}</span>
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed break-words">
              Formatos aceitos: JPEG, PNG e WebP (máx. 10MB). A imagem será convertida automaticamente para WebP otimizado.
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

        {/* Área Interativa de Recorte */}
        <div className="relative w-full min-w-0 h-[260px] sm:h-[340px] bg-zinc-950 border border-border/60 rounded-2xl overflow-hidden shadow-inner">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onRotationChange={setRotation}
            onCropComplete={handleCropComplete}
            showGrid={true}
          />
        </div>

        {/* Controles de Zoom e Rotação */}
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
              onChange={(e) => setZoom(parseFloat(e.target.value))}
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
              onClick={() => handleRotate(90)}
              title="Girar 90° para a direita"
              className="h-8 px-2.5 rounded-xl text-[11px] font-semibold gap-1 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              +90°
            </Button>
          </div>
        </div>

        <div className="w-full min-w-0 pt-3 border-t border-border/50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
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
            disabled={processing}
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
      </DialogContent>
    </Dialog>
  );
}
