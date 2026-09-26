"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2, Sparkles, Check, X } from "lucide-react";
import { bannerService, HighlightBannerData } from "../../services/bannerService";
import { useToast } from "../ui/ToastNotification";

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
  const [error, setError] = useState("");

  const { showToast } = useToast();

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
    } catch (err: any) {
      setError(err.message || "Erro ao salvar alterações do banner.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
              <span className="text-3xl shrink-0">{icon || "🥣"}</span>
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
            {/* Campo Ícone / Emoji */}
            <div className="sm:col-span-1 space-y-1.5">
              <Label htmlFor="banner-icon" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Ícone / Emoji
              </Label>
              <Input
                id="banner-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="h-11 text-center text-xl rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                placeholder="🥣"
                maxLength={8}
                required
              />
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
  );
}
