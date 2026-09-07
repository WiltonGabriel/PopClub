"use client";

import { useState, useEffect, useMemo } from "react";
import { promotionService, Promotion } from "../../services/promotionService";
import { productService, Product } from "../../services/productService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tag, Sparkles, Image as ImageIcon, Loader2 } from "lucide-react";
import { ImageCropperDialog } from "./ImageCropperDialog";

interface PromotionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  promoToEdit?: Promotion | null;
}

const BRAND_COLORS = [
  { label: "Pop Shake", value: "#9306CF" },
  { label: "Açaí Vibrante", value: "#881BAA" },
  { label: "Círculo Maior", value: "#940068" },
  { label: "Círculo Claro", value: "#512B54" },
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
  const [gradientStart, setGradientStart] = useState("#9306CF");
  const [gradientEnd, setGradientEnd] = useState("#881BAA");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<{ [id: string]: number }>({});
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setGradientStart(promoToEdit.gradientStart || "#9306CF");
      setGradientEnd(promoToEdit.gradientEnd || "#881BAA");
      setBannerUrl(promoToEdit.bannerImageUrl || "");
      setBannerFile(null);
      setRawBannerSrc(null);
      setCropModalOpen(false);

      const itemsMap: { [id: string]: number } = {};
      promoToEdit.items?.forEach((it) => {
        itemsMap[it.productId] = it.quantity;
      });
      setSelectedProductIds(itemsMap);
    } else {
      setTitle("");
      setBadge("PROMO");
      setDescription("");
      setDiscountType("percentage");
      setDiscountValue("15");
      setGradientStart("#9306CF");
      setGradientEnd("#881BAA");
      setBannerUrl("");
      setBannerFile(null);
      setRawBannerSrc(null);
      setCropModalOpen(false);
      setSelectedProductIds({});
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

  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = 1;
      }
      return next;
    });
  };

  const handleQuantityChange = (productId: string, qty: number) => {
    if (qty <= 0) return;
    setSelectedProductIds((prev) => ({
      ...prev,
      [productId]: qty,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const items = Object.entries(selectedProductIds).map(([productId, quantity]) => ({
        productId,
        quantity,
      }));

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
        items,
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
        <DialogContent className="max-w-[920px] w-full p-0 overflow-hidden bg-background border-border border-2 grid grid-cols-1 md:grid-cols-2 gap-0 rounded-none shadow-[12px_12px_0px_0px_rgba(147,6,207,0.3)]">
          <div className="p-6 bg-card flex flex-col justify-between border-b md:border-b-0 md:border-r border-border">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Live Preview do Banner
                </h4>
              </div>

              <div
                className="w-full h-44 rounded-none border-2 border-border flex items-center p-6 relative overflow-hidden shadow-lg transition-all"
                style={{
                  background: `linear-gradient(to right, ${gradientStart}, ${gradientEnd})`,
                }}
              >
                {bannerPreviewSrc && (
                  <div className="absolute inset-0 z-0 opacity-25">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerPreviewSrc}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="z-10 max-w-[280px]">
                  <span className="bg-background text-foreground text-[10px] font-mono uppercase px-2 py-1 tracking-widest mb-2 inline-block font-bold">
                    {badge || "PROMO"}
                  </span>
                  <h3 className="font-heading text-2xl font-bold uppercase tracking-tight text-white leading-tight mb-1 truncate">
                    {title || "Título da Promoção"}
                  </h3>
                  <p className="text-xs text-white/90 font-sans line-clamp-2">
                    {description || "Descrição atrativa da promoção com o desconto..."}
                  </p>
                  <div className="mt-2 text-xs font-mono font-bold text-white bg-black/30 px-2 py-0.5 inline-block">
                    {discountType === "percentage" ? `${discountValue || 0}% OFF` : `R$ ${discountValue || 0} OFF`}
                  </div>
                </div>

                <div className="absolute -right-8 -bottom-8 opacity-20 pointer-events-none">
                  <Tag className="w-40 h-40 text-white" />
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <h5 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Produtos Inclusos ({Object.keys(selectedProductIds).length})
              </h5>
              <div className="max-h-36 overflow-y-auto space-y-1.5 no-scrollbar text-xs font-mono">
                {Object.keys(selectedProductIds).length === 0 ? (
                  <p className="text-muted-foreground italic">Nenhum produto selecionado ainda.</p>
                ) : (
                  Object.entries(selectedProductIds).map(([pId, qty]) => {
                    const p = availableProducts.find((item) => item.id === pId);
                    return (
                      <div key={pId} className="flex justify-between items-center bg-background p-2 border border-border">
                        <span className="truncate flex-1">{p?.name || pId}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(pId, qty - 1)}
                            className="w-5 h-5 bg-muted flex items-center justify-center font-bold border border-border"
                          >
                            -
                          </button>
                          <span>{qty}x</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(pId, qty + 1)}
                            className="w-5 h-5 bg-muted flex items-center justify-center font-bold border border-border"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[85vh]">
            <DialogHeader className="mb-4">
              <DialogTitle className="font-heading text-2xl uppercase tracking-tight">
                {promoToEdit ? "Editar Promoção" : "Nova Promoção"}
              </DialogTitle>
            </DialogHeader>

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-3 mb-4 font-mono">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">Título</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Combo Galáctico"
                    className="rounded-none border-2 border-border"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">Badge</Label>
                  <Input
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="Ex: 20% OFF"
                    className="rounded-none border-2 border-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="font-mono text-xs uppercase text-muted-foreground">Descrição</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Açaí 700ml + Cupuaçu com 20% OFF!"
                  className="rounded-none border-2 border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">Tipo de Desconto</Label>
                  <Select
                    value={discountType}
                    onValueChange={(val: any) => {
                      if (val === "percentage" || val === "fixed") setDiscountType(val);
                    }}
                  >
                    <SelectTrigger className="rounded-none border-2 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-border bg-card">
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">Valor do Desconto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "percentage" ? "Ex: 20" : "Ex: 10.00"}
                    className="rounded-none border-2 border-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase text-muted-foreground flex justify-between">
                  <span>Cores do Gradiente</span>
                  <span className="text-[10px] text-muted-foreground">Paleta da Marca</span>
                </Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.target.value)}
                    className="w-10 h-8 p-0 border-2 border-border rounded-none cursor-pointer bg-transparent"
                  />
                  <input
                    type="color"
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.target.value)}
                    className="w-10 h-8 p-0 border-2 border-border rounded-none cursor-pointer bg-transparent"
                  />
                  <div className="flex gap-1 flex-wrap flex-1">
                    {BRAND_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => { setGradientStart(c.value); }}
                        className="w-5 h-5 rounded-none border border-border"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Mini-Banner (Upload Local ou URL)
                  </Label>
                  <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 border border-primary/30">
                    16:9 (Banner Widescreen) • até 10MB
                  </span>
                </div>
                <div className="flex border-2 border-border bg-background focus-within:border-secondary transition-colors h-10 relative overflow-hidden group">
                  <div className="bg-muted px-3 flex items-center justify-center font-mono text-xs uppercase tracking-wider text-muted-foreground border-r-2 border-border group-hover:bg-muted/80 transition-colors">
                    {bannerFile ? "Substituir" : "Escolher Arquivo"}
                  </div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleBannerFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex-1 px-3 flex items-center font-mono text-xs text-foreground truncate">
                    {bannerFile ? bannerFile.name : (bannerUrl ? "Imagem configurada" : "Nenhum arquivo selecionado")}
                  </div>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Formatos aceitos: JPEG, PNG, WebP. Enquadre no formato 16:9 widescreen.
                </p>
                <Input
                  type="text"
                  placeholder="Ou cole a URL direta da imagem..."
                  value={bannerUrl}
                  onChange={(e) => {
                    setBannerUrl(e.target.value);
                    if (e.target.value) setBannerFile(null);
                  }}
                  className="rounded-none border-2 border-border text-xs mt-1"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="font-mono text-xs uppercase text-muted-foreground">
                  Vincular Produtos ao Combo
                </Label>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-border p-2 bg-muted/20">
                  {availableProducts.map((prod) => {
                    const isChecked = Boolean(selectedProductIds[prod.id]);
                    const qty = selectedProductIds[prod.id] || 1;
                    return (
                      <div
                        key={prod.id}
                        className={`flex items-center justify-between p-2 border transition-colors ${
                          isChecked ? "border-primary bg-primary/10" : "border-border/50 bg-background"
                        }`}
                      >
                        <label className="flex items-center gap-2 text-xs cursor-pointer flex-1 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleProduct(prod.id)}
                            className="accent-primary"
                          />
                          <span className="font-bold truncate">{prod.name}</span>
                          <span className="text-muted-foreground font-mono">R$ {prod.price.toFixed(2)}</span>
                        </label>

                        {isChecked && (
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <span className="text-[10px] text-muted-foreground">Qtd:</span>
                            <input
                              type="number"
                              min={1}
                              value={qty}
                              onChange={(e) => handleQuantityChange(prod.id, parseInt(e.target.value) || 1)}
                              className="w-12 h-6 px-1 border border-border text-center bg-background"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="rounded-none font-mono text-xs uppercase"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs uppercase font-bold px-6"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {promoToEdit ? "Salvar Alterações" : "Criar Promoção"}
                </Button>
              </div>
            </form>
          </div>
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
