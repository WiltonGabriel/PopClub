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
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, "popclub-crop.webp");
      onCropComplete(croppedFile);
    } catch (err) {
      console.error("Erro ao recortar imagem:", err);
      alert("Erro ao recortar a imagem. Tente novamente.");
    } finally {
      setProcessing(false);
    }
  };

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="max-w-[700px] w-full p-6 bg-background border-2 border-border rounded-none shadow-[12px_12px_0px_0px_rgba(147,6,207,0.3)]">
        <DialogHeader className="mb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-heading text-2xl uppercase tracking-tight flex items-center gap-2">
              <Crop className="w-5 h-5 text-primary" />
              Recorte & Enquadramento da Imagem
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Aviso de Proporção e Limites */}
        <div className="bg-primary/10 border-l-4 border-primary p-3 mb-3 text-xs font-mono flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p>
              <strong>Proporção recomendada:</strong>{" "}
              <span className="text-primary font-bold">{aspectLabel}</span>
            </p>
            <p className="text-muted-foreground text-[11px]">
              Formatos aceitos: JPEG, PNG, WebP (máx. 10MB). A imagem será convertida para WebP otimizado.
            </p>
          </div>
        </div>

        {/* Área Interativa de Recorte */}
        <div className="relative w-full h-[360px] bg-black border-2 border-border overflow-hidden">
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
        <div className="mt-4 flex items-center gap-3 bg-card border border-border p-3">
          <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-mono text-xs uppercase text-muted-foreground">Zoom:</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-primary cursor-pointer"
          />
          <span className="font-mono text-xs text-primary font-bold w-12 text-right">
            {zoom.toFixed(1)}x
          </span>
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing}
            className="rounded-none font-mono text-xs uppercase flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCrop}
            disabled={processing}
            className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs uppercase font-bold flex items-center gap-1.5 px-6"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Processando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Confirmar Recorte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
