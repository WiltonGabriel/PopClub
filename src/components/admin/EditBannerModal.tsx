"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2, Sparkles, Check, Upload, Trash2, Crop } from "lucide-react";
import { bannerService, HighlightBannerData } from "../../services/bannerService";
import { useToast } from "../ui/ToastNotification";
import { ImageCropperDialog } from "./ImageCropperDialog";

function isBannerIconImageUrl(iconValue: string | undefined | null): boolean {
  if (!iconValue) return false;
  const trimmed = iconValue.trim();
  return trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed);
}

interface EditBannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBanner: HighlightBannerData;
  onSaved: (banner: HighlightBannerData) => void;
}

export function EditBannerModal({
  open,
  onOpenChange,
  currentBanner,
  onSaved,
}: EditBannerModalProps) {
  const [icon, setIcon] = useState(currentBanner.icon || "🥣");
  const [title, setTitle] = useState(currentBanner.title || "");
  const [subtitle, setSubtitle] = useState(currentBanner.subtitle || "");
  const [badge, setBadge] = useState(currentBanner.badge || "");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { showToast } = useToast();
  const isImageIcon = isBannerIconImageUrl(icon);

  const revokeCropperSrc = (srcToRevoke: string | null) => {
    if (srcToRevoke && srcToRevoke.startsWith("blob:")) {
      URL.revokeObjectURL(srcToRevoke);
    }
  };

  useEffect(() => {
    return () => {
      if (cropperSrc && cropperSrc.startsWith("blob:")) {
        URL.revokeObjectURL(cropperSrc);
      }
    };
  }, [cropperSrc]);

  const uploadBannerImageFile = async (fileToUpload: File) => {
    setUploadingImage(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("type", "product");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Falha ao enviar imagem do banner.");
      }
      setIcon(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.type === "image/svg+xml") {
      await uploadBannerImageFile(file);
      return;
    }

    revokeCropperSrc(cropperSrc);
    const objectUrl = URL.createObjectURL(file);
    setCropperSrc(objectUrl);
  };

  const handleCropCancel = () => {
    revokeCropperSrc(cropperSrc);
    setCropperSrc(null);
  };

  const handleCropConfirm = async (croppedFile: File) => {
    revokeCropperSrc(cropperSrc);
    setCropperSrc(null);
    await uploadBannerImageFile(croppedFile);
  };

  // Sincroniza o estado interno sempre que o banner atual mudar ou ao abrir
  useEffect(() => {
    if (open) {
      setIcon(currentBanner.icon || "🥣");
      setTitle(currentBanner.title || "");
      setSubtitle(currentBanner.subtitle || "");
      setBadge(currentBanner.badge || "");
      setError("");
    }
  }, [open, currentBanner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: HighlightBannerData = {
        icon: icon.trim() || "🥣",
        title: title.trim() || "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
        subtitle: subtitle.trim() || "Açaí puro batido na hora, cremoso e com acompanhamentos à sua escolha.",
        badge: badge.trim() || "Refrescância Artesanal",
      };

      const updated = await bannerService.updateHighlightBanner(payload);
      onSaved(updated);
      onOpenChange(false);
      showToast({
        title: "Banner Atualizado!",
        message: "A faixa de destaque da página inicial foi alterada com sucesso.",
        type: "success",
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao salvar alterações do banner.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1F0B22] text-foreground border border-gray-200 dark:border-border/40 shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle className="font-heading text-xl sm:text-2xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>Editar Faixa Promocional</span>
          </DialogTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Personalize a mensagem de apelo comercial exibida em destaque na página inicial.
          </p>
        </DialogHeader>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* Pré-visualização ao vivo */}
        <div className="space-y-1.5 mb-5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Pré-visualização em Tempo Real
          </Label>
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-[#10B981]/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs transition-all">
            <div className="flex items-center gap-3">
              {isImageIcon ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={icon}
                  alt="Imagem do banner"
                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-primary/20 shadow-xs"
                />
              ) : (
                <span className="text-3xl shrink-0">{icon || "🥣"}</span>
              )}
              <div className="min-w-0">
                <p className="font-heading font-bold text-xs sm:text-sm text-foreground dark:text-foreground leading-snug">
                  {title || "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos"}
                </p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">
                  {subtitle || "Açaí puro batido na hora, cremoso e com acompanhamentos à sua escolha."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white dark:bg-background text-primary dark:text-muted-foreground border border-primary/25 shadow-xs">
                {badge || "Refrescância Artesanal"}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            {/* Campo Ícone / Emoji ou Upload de Imagem */}
            <div className="sm:col-span-1 space-y-1.5">
              <Label htmlFor="banner-icon" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Ícone / Imagem
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleImageUpload}
              />
              {isImageIcon ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-11 flex-1 rounded-xl text-[11px] font-bold cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Trocar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    onClick={() => setCropperSrc(icon)}
                    title="Editar ou recortar imagem atual"
                    className="h-11 px-2.5 rounded-xl text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    <Crop className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIcon("🥣")}
                    title="Remover imagem e usar emoji"
                    className="h-11 px-2.5 rounded-xl text-rose-500 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input
                    id="banner-icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="h-11 text-center text-xl rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                    placeholder="🥣"
                    maxLength={8}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    title="Enviar imagem para o banner"
                    className="h-11 px-2.5 rounded-xl shrink-0 cursor-pointer"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-primary" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Campo Tag / Badge Lateral */}
            <div className="sm:col-span-3 space-y-1.5">
              <Label htmlFor="banner-badge" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Texto da Tag Lateral
              </Label>
              <Input
                id="banner-badge"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="h-11 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                placeholder="Ex: REFRESCÂNCIA ARTESANAL"
                required
              />
            </div>
          </div>

          {/* Campo Título Principal */}
          <div className="space-y-1.5">
            <Label htmlFor="banner-title" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Título Principal
            </Label>
            <Input
              id="banner-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
              placeholder="Ex: Monte do seu jeito: escolha o tamanho e adicione..."
              required
            />
          </div>

          {/* Campo Subtítulo / Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="banner-subtitle" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Subtítulo / Descrição
            </Label>
            <Input
              id="banner-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="h-11 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
              placeholder="Ex: Açaí puro batido na hora, cremoso e com acompanhamentos..."
              required
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-border/30">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-11 px-5 rounded-xl border-gray-200 dark:border-border/40 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold uppercase tracking-wider"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/20 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <ImageCropperDialog
      open={Boolean(cropperSrc)}
      imageSrc={cropperSrc}
      aspectRatio={1}
      aspectLabel="1:1 (Ícone / Miniatura do Banner)"
      maxDimension={800}
      onCropComplete={handleCropConfirm}
      onCancel={handleCropCancel}
    />
    </>
  );
}
