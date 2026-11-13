"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { getCroppedImg } from "../../lib/cropImage";
import { ZoomIn, Crop, AlertCircle, Check, X, Loader2 } from "lucide-react";

interface ImageCropperDialogProps {
  open: boolean;
  imageSrc: string | null;
  aspectRatio: number; // ex: 1 / 1 para produtos, 16 / 9 para promoções
  aspectLabel: string; // ex: "1:1 (Quadrado)" ou "16:9 (Banner)"
  onCropComplete: (file: File) => void;
  onCancel: () => void;
}

export function ImageCropperDialog({
  open,
  imageSrc,
  aspectRatio,
  aspectLabel,
  onCropComplete,
  onCancel,
}: ImageCropperDialogProps) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  const onCropChange = (newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const handleCropComplete = useCallback((_croppedArea: Area, currentPixels: Area) => {
    setCroppedAreaPixels(currentPixels);
  }, []);

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setProcessing(true);
    setCropError(null);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, "popshake-crop.webp");
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
      <DialogContent className="max-w-[700px] w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-6 bg-background/95 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl">
        <DialogHeader className="mb-1">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="font-heading text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Crop className="w-5 h-5" />
              </span>
              Recorte e enquadramento da imagem
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Aviso de Proporção e Limites */}
        <div className="bg-primary/8 border border-primary/20 rounded-2xl p-3.5 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-foreground">
              <strong>Proporção recomendada:</strong>{" "}
              <span className="text-primary font-bold">{aspectLabel}</span>
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Formatos aceitos: JPEG, PNG e WebP (máx. 10MB). A imagem será convertida automaticamente para WebP otimizado.
            </p>
          </div>
        </div>

        {cropError && (
          <div
            role="alert"
            className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-3 text-xs font-medium flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{cropError}</span>
          </div>
        )}

        {/* Área Interativa de Recorte */}
        <div className="relative w-full h-[320px] sm:h-[360px] bg-zinc-950 border border-border/60 rounded-2xl overflow-hidden shadow-inner">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={handleCropComplete}
            showGrid={true}
          />
        </div>

        {/* Controle de Zoom */}
        <div className="flex items-center gap-3 bg-muted/40 border border-border/50 rounded-2xl p-3.5">
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
            className="flex-1 accent-primary cursor-pointer"
          />
          <span className="text-xs text-primary font-bold tabular-nums w-12 text-right">
            {zoom.toFixed(1)}x
          </span>
        </div>

        <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing}
            className="rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 h-10 px-4"
          >
            <X className="w-3.5 h-3.5" /> Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCrop}
            disabled={processing}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 h-10 px-6 shadow-md"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Processando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Confirmar recorte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
