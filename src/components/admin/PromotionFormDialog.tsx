"use client";

import { useState, useEffect, useMemo } from "react";
import { promotionService, Promotion } from "../../services/promotionService";
import { productService, Product } from "../../services/productService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tag, Sparkles, Image as ImageIcon, Loader2, Clock, Eye } from "lucide-react";
import { ImageCropperDialog } from "./ImageCropperDialog";

interface PromotionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  promoToEdit?: Promotion | null;
}

const BRAND_COLORS = [
  { label: "Pop Shake", value: "hsl(var(--primary))" },
  { label: "Açaí Vibrante", value: "#881BAA" },
  { label: "Círculo Maior", value: "hsl(var(--accent))" },
  { label: "Círculo Claro", value: "hsl(var(--border))" },
  { label: "Folha Açaí", value: "#35A340" },
];

export function PromotionFormDialog({
  open,
  onOpenChange,
  onSaved,
  promoToEdit,
}: PromotionFormDialogProps) {
  const [title, setTitle] = useState("");
  const [badge, setBadge] = useState("PROMO");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [gradientStart, setGradientStart] = useState("hsl(var(--primary))");
  const [gradientEnd, setGradientEnd] = useState("#881BAA");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [autoBanner, setAutoBanner] = useState(false);

  // Duração & Escassez
  const [durationDays, setDurationDays] = useState<string>("");
  const [showScarcity, setShowScarcity] = useState(false);
  const [scarcityUnits, setScarcityUnits] = useState<string>("");

  // Estados do Modal de Recorte
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawBannerSrc, setRawBannerSrc] = useState<string | null>(null);

  useEffect(() => {
    productService.getProducts().then(setAvailableProducts).catch(console.error);
  }, []);

  useEffect(() => {
    if (promoToEdit) {
      setTitle(promoToEdit.title);
      setBadge(promoToEdit.badge);
      setDescription(promoToEdit.description);
      setDiscountType(promoToEdit.discountType);
      setDiscountValue(promoToEdit.discountValue.toString());
      setGradientStart(promoToEdit.gradientStart || "hsl(var(--primary))");
      setGradientEnd(promoToEdit.gradientEnd || "#881BAA");
      setBannerUrl(promoToEdit.bannerImageUrl || "");
      setBannerFile(null);
      setRawBannerSrc(null);
      setCropModalOpen(false);

      setSelectedProductId(promoToEdit.productId || null);
      setAutoBanner(promoToEdit.autoBanner || false);

      if (promoToEdit.expiresAt) {
        const diff = new Date(promoToEdit.expiresAt).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        setDurationDays(days > 0 ? String(days) : "");
      } else {
        setDurationDays("");
      }
      setShowScarcity(promoToEdit.showScarcity || false);
      setScarcityUnits(promoToEdit.scarcityUnits ? String(promoToEdit.scarcityUnits) : "");
    } else {
      setTitle("");
      setBadge("PROMO");
      setDescription("");
      setDiscountType("percentage");
      setDiscountValue("15");
      setGradientStart("hsl(var(--primary))");
      setGradientEnd("#881BAA");
      setBannerUrl("");
      setBannerFile(null);
      setRawBannerSrc(null);
      setCropModalOpen(false);
      setSelectedProductId(null);
      setAutoBanner(false);
      setDurationDays("");
      setShowScarcity(false);
      setScarcityUnits("");
    }
  }, [promoToEdit, open]);

  const bannerPreviewSrc = useMemo(() => {
    if (bannerFile) {
      return URL.createObjectURL(bannerFile);
    }
    return bannerUrl;
  }, [bannerFile, bannerUrl]);

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    e.target.value = "";

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedMimeTypes.includes(selectedFile.type.toLowerCase())) {
      setError("Formato inválido. Apenas imagens JPEG, PNG ou WebP são aceitas.");
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setError(`O arquivo selecionado excede o limite de 10MB (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setRawBannerSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleBannerCropComplete = (croppedFile: File) => {
    setBannerFile(croppedFile);
    setCropModalOpen(false);
    setRawBannerSrc(null);
  };

  const handleBannerCropCancel = () => {
    setCropModalOpen(false);
    setRawBannerSrc(null);
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(prev => prev === productId ? null : productId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let expiresAt: string | null = null;
      if (durationDays) {
        const days = parseInt(durationDays, 10);
        if (!isNaN(days) && days > 0) {
          const target = new Date();
          target.setDate(target.getDate() + days);
          expiresAt = target.toISOString();
        }
      }

      const payload = {
        title,
        badge,
        description,
        discountType,
        discountValue: parseFloat(discountValue) || 0,
        gradientStart,
        gradientEnd,
        bannerImageUrl: bannerUrl,
        isActive: true,
        expiresAt,
        productId: selectedProductId,
        autoBanner,
        showScarcity,
        scarcityUnits: showScarcity && scarcityUnits ? parseInt(scarcityUnits) : null,
      };

      if (promoToEdit) {
        await promotionService.updatePromotion(promoToEdit.id, payload, bannerFile || undefined);
      } else {
        await promotionService.createPromotion(payload, bannerFile || undefined);
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar promoção");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-3xl sm:max-w-3xl max-h-[88vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#200B22] border border-gray-200 dark:border-border/40 text-foreground shadow-2xl space-y-6">
          <DialogHeader className="border-b border-gray-100 dark:border-border/30 pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-heading font-black text-foreground dark:text-foreground flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary dark:text-muted-foreground flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <span>{promoToEdit ? "Editar Promoção / Oferta" : "Nova Promoção / Oferta Especial"}</span>
            </DialogTitle>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure descontos diretos, ofertas relâmpago ou banners promocionais com destaque visual na vitrine.
            </p>
          </DialogHeader>

          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-300 text-xs sm:text-sm flex items-center gap-2.5 font-medium">
              <span>{error}</span>
            </div>
          )}

          {/* Live Preview do Banner da Promoção */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h4 className="font-mono text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold">
                Pré-visualização do Destaque
              </h4>
            </div>

            <div
              className="w-full h-40 sm:h-44 rounded-2xl flex items-center p-6 relative overflow-hidden shadow-md transition-all border border-white/10"
              style={{
                background: `linear-gradient(to right, ${gradientStart}, ${gradientEnd})`,
              }}
            >
              {bannerPreviewSrc && (
                <div className="absolute inset-0 z-0 opacity-30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bannerPreviewSrc}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="z-10 max-w-sm">
                <span className="bg-white/90 dark:bg-background/90 text-gray-900 dark:text-gray-100 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md tracking-wider mb-2 inline-block shadow-xs">
                  {badge || "PROMO"}
                </span>
                <h3 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-tight mb-1 truncate">
                  {title || "Título da Promoção"}
                </h3>
                <p className="text-xs text-white/90 font-sans line-clamp-2">
                  {description || "Descreva aqui as vantagens imperdíveis desta oferta especial..."}
                </p>
                <div className="mt-2 text-xs font-mono font-bold text-white bg-black/40 px-2.5 py-1 rounded-md inline-block backdrop-blur-xs">
                  {discountType === "percentage" ? `${discountValue || 0}% OFF` : `R$ ${discountValue || 0} OFF`}
                </div>
              </div>

              <div className="absolute -right-6 -bottom-6 opacity-20 pointer-events-none">
                <Tag className="w-36 h-36 text-white" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            {/* 1. Nome e Badge da Promoção */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Título da Promoção *
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Quinta do Açaí 20% OFF"
                  className="font-medium bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 text-xs sm:text-sm rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Badge *
                </Label>
                <Input
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="Ex: 20% OFF"
                  className="font-bold text-xs sm:text-sm bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                  required
                />
              </div>
            </div>

            {/* 2. Descrição */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Descrição da Oferta
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Todos os copos de 500ml e 700ml com desconto especial hoje!"
                className="bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 text-xs sm:text-sm rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
              />
            </div>

            {/* 3. Regras de Desconto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Tipo de Desconto
                </Label>
                <Select
                  value={discountType}
                  onValueChange={(val: any) => {
                    if (val === "percentage" || val === "fixed") setDiscountType(val);
                  }}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 rounded-xl text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200 dark:border-border/40 bg-white dark:bg-[#200B22]">
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Valor do Desconto *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "Ex: 20" : "Ex: 10.00"}
                  className="bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 rounded-xl font-mono text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                  required
                />
              </div>
            </div>

            {/* 4. Cores do Gradiente */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex justify-between">
                <span>Cores do Gradiente</span>
                <span className="text-[11px] text-gray-400 font-normal">Paleta Pop Shake</span>
              </Label>
              <div className="flex gap-2.5 items-center">
                <input
                  type="color"
                  value={gradientStart}
                  onChange={(e) => setGradientStart(e.target.value)}
                  className="w-11 h-10 p-0 border border-gray-300 dark:border-border/40 rounded-xl cursor-pointer bg-transparent"
                />
                <input
                  type="color"
                  value={gradientEnd}
                  onChange={(e) => setGradientEnd(e.target.value)}
                  className="w-11 h-10 p-0 border border-gray-300 dark:border-border/40 rounded-xl cursor-pointer bg-transparent"
                />
                <div className="flex gap-1.5 flex-wrap flex-1 pl-2">
                  {BRAND_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => { setGradientStart(c.value); }}
                      className="w-7 h-7 rounded-lg border border-white/20 shadow-xs cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Mini-Banner */}
            <div className="space-y-3 border-t border-gray-100 dark:border-border/30 pt-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Banner da Oferta
                </Label>
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={autoBanner}
                    onChange={(e) => setAutoBanner(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-gray-300"
                  />
                  Gerar Automaticamente com os Produtos Escolhidos
                </label>

                {!autoBanner && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-[11px] text-gray-500 font-mono">Upload Manual da Imagem (16:9)</Label>
                    </div>
                    <div className="flex border border-gray-200 dark:border-border/40 bg-gray-50 dark:bg-background rounded-xl h-11 relative overflow-hidden group">
                      <div className="bg-gray-200 dark:bg-white/10 px-3.5 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-border/40 group-hover:bg-gray-300 transition-colors">
                        {bannerFile ? "Substituir" : "Escolher Imagem"}
                      </div>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleBannerFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex-1 px-3.5 flex items-center text-xs text-gray-600 dark:text-gray-300 truncate">
                        {bannerFile ? bannerFile.name : (bannerUrl ? "Imagem configurada por URL" : "Nenhum arquivo selecionado")}
                      </div>
                    </div>
                    <Input
                      type="text"
                      placeholder="Ou cole o link direto da imagem..."
                      value={bannerUrl}
                      onChange={(e) => {
                        setBannerUrl(e.target.value);
                        if (e.target.value) setBannerFile(null);
                      }}
                      className="bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-10 text-xs rounded-xl"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 6. Produtos Vinculados (Opcional) */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-border/30">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span>Produto da Promoção (Opcional)</span>
                <span className="text-[11px] font-mono text-gray-400">
                  {selectedProductId ? "1" : "0"} selecionado
                </span>
              </Label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-gray-200 dark:border-border/40 p-2.5 rounded-xl bg-gray-50/50 dark:bg-background/50">
                {availableProducts.map((prod) => {
                  const isChecked = selectedProductId === prod.id;
                  return (
                    <div
                      key={prod.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                        isChecked
                          ? "border-primary/40 bg-primary/5/60 dark:bg-primary/95/20"
                          : "border-gray-200/60 dark:border-border/30 bg-white dark:bg-[#200B22]"
                      }`}
                    >
                      <label className="flex items-center gap-2.5 text-xs cursor-pointer flex-1 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectProduct(prod.id)}
                          className="accent-[hsl(var(--primary))] w-4 h-4 rounded"
                        />
                        <span className="font-bold text-gray-800 dark:text-gray-200 truncate">{prod.name}</span>
                        <span className="text-gray-400 font-mono text-[11px]">R$ {Number(prod.price).toFixed(2).replace(".", ",")}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Escassez e Prazo */}
            <div className="pt-6 border-t border-gray-100 dark:border-border/30">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Regras de Escassez e Prazo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                    Duração da Oferta (em dias)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    placeholder="Ex: 3 (deixe vazio p/ indeterminado)"
                    className="bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 rounded-xl text-sm"
                  />
                  {durationDays && (
                    <p className="text-[11px] text-emerald-600 font-medium">
                      Válido até: {new Date(Date.now() + parseInt(durationDays) * 86400000).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showScarcity}
                      onChange={(e) => setShowScarcity(e.target.checked)}
                      className="w-4 h-4 text-primary rounded border-gray-300"
                    />
                    <Eye className="w-4 h-4 text-gray-500" />
                    Mostrar Escassez para o Cliente
                  </label>
                  
                  {showScarcity && (
                    <div className="bg-gray-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-3 mt-2">
                      <Label className="text-xs text-muted-foreground block">
                        Unidades Restantes (Opcional)
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={scarcityUnits}
                        onChange={(e) => setScarcityUnits(e.target.value)}
                        placeholder="Ex: 5"
                        className="bg-white dark:bg-background border-gray-200 dark:border-border/40 h-10 rounded-xl text-sm"
                      />
                      <p className="text-[10px] text-gray-500">
                        Se definido, exibirá "Apenas {scarcityUnits || 'X'} restantes!"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-border/30">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl font-heading text-xs uppercase tracking-wider px-5 h-11"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white rounded-xl font-heading text-xs uppercase tracking-wider font-bold px-7 h-11 shadow-md shadow-primary/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {promoToEdit ? "Salvar Alterações" : "Criar Promoção"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ImageCropperDialog
        open={cropModalOpen}
        imageSrc={rawBannerSrc}
        aspectRatio={16 / 9}
        aspectLabel="16:9 (Banner Widescreen)"
        onCropComplete={handleBannerCropComplete}
        onCancel={handleBannerCropCancel}
      />
    </>
  );
}
