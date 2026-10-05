"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { productService, Product } from "../../services/productService";
import { badgeService, CardBadge } from "../../services/badgeService";
import { ImageCropperDialog } from "./ImageCropperDialog";
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Percent,
  DollarSign,
  Search,
  AlertCircle,
  Loader2,
  TrendingDown,
  Clock,
  Eye,
  Users,
  Image as ImageIcon,
  Upload,
} from "lucide-react";

interface ComboFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  comboToEdit?: Product | null;
}

export function ComboFormDialog({
  open,
  onOpenChange,
  onSaved,
  comboToEdit,
}: ComboFormDialogProps) {
  const [title, setTitle] = useState("");
  const [badge, setBadge] = useState("COMBO POP");
  const [description, setDescription] = useState("");
  const [pricingMode, setPricingMode] = useState<"percentage" | "fixed_price">("percentage");
  const [discountPercent, setDiscountPercent] = useState("15");
  const [fixedComboPrice, setFixedComboPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Rendimento e Imagem
  const [servesText, setServesText] = useState(comboToEdit?.servesText || "");
  const [file, setFile] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  // Duração
  const [durationDays, setDurationDays] = useState<string>("");
  const [showDuration, setShowDuration] = useState(false);
  const [durationDisplay, setDurationDisplay] = useState<string[]>([]);
  const [validUntilPreview, setValidUntilPreview] = useState<string | null>(null);

  useEffect(() => {
    if (durationDays && !isNaN(parseInt(durationDays))) {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(durationDays));
      setValidUntilPreview(d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }));
    } else {
      setValidUntilPreview(null);
    }
  }, [durationDays]);

  // Produtos do combo: { [productId]: quantity }
  const [comboItems, setComboItems] = useState<{ [productId: string]: number }>({});
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [badges, setBadges] = useState<CardBadge[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return comboToEdit?.imageUrl || "";
  }, [file, comboToEdit?.imageUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setRawImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleCropComplete = (croppedFile: File) => {
    setFile(croppedFile);
    setCropModalOpen(false);
    setRawImageSrc(null);
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setRawImageSrc(null);
  };

  useEffect(() => {
    if (open) {
      productService
        .getProducts()
        .then(setAvailableProducts)
        .catch(() => {});
      badgeService
        .getBadges()
        .then(setBadges)
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (comboToEdit) {
      setTitle(comboToEdit.name);
      setBadge(comboToEdit.cardBadge?.text || "COMBO POP"); // Fallback
      setDescription(comboToEdit.description || "");
      setIsActive(comboToEdit.isAvailable ?? true);
      setServesText(comboToEdit.servesText || "");
      setFile(null);
      setCropModalOpen(false);
      setRawImageSrc(null);

      const itemsMap: { [productId: string]: number } = {};
      comboToEdit.comboItems?.forEach((it) => {
        itemsMap[it.productId] = it.quantity;
      });
      setComboItems(itemsMap);

      // Simplification: always use fixed price if editing a combo, since we just have final price
      setPricingMode("fixed_price");
      setFixedComboPrice(String(comboToEdit.price));
      
      setDurationDays("");
      setShowDuration(false);
      setDurationDisplay([]);
    } else {
      setTitle("");
      setBadge("COMBO POP");
      setDescription("");
      setPricingMode("percentage");
      setDiscountPercent("15");
      setFixedComboPrice("");
      setIsActive(true);
      setServesText("");
      setFile(null);
      setCropModalOpen(false);
      setRawImageSrc(null);
      setComboItems({});
      setDurationDays("");
      setShowDuration(false);
      setDurationDisplay([]);
    }
    setError("");
    setProductSearch("");
  }, [comboToEdit, open]);

  // Produtos disponíveis mapeados por ID
  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    availableProducts.forEach((p) => map.set(p.id, p));
    return map;
  }, [availableProducts]);

  // Soma original dos itens selecionados
  const originalSum = useMemo(() => {
    let sum = 0;
    Object.entries(comboItems).forEach(([pId, qty]) => {
      const p = productsMap.get(pId);
      if (p && qty > 0) {
        sum += Number(p.price) * qty;
      }
    });
    return Number(sum.toFixed(2));
  }, [comboItems, productsMap]);

  // Preço final calculado e economia
  const { finalPrice, savings, effectivePct } = useMemo(() => {
    if (originalSum === 0) return { finalPrice: 0, savings: 0, effectivePct: 0 };

    if (pricingMode === "percentage") {
      const pct = Math.max(0, Math.min(100, Number(discountPercent) || 0));
      const final = originalSum * (1 - pct / 100);
      const save = originalSum - final;
      return {
        finalPrice: Number(final.toFixed(2)),
        savings: Number(save.toFixed(2)),
        effectivePct: pct,
      };
    } else {
      const fixed = Math.max(0, Number(fixedComboPrice) || originalSum);
      const save = Math.max(0, originalSum - fixed);
      const pct = originalSum > 0 ? Math.round((save / originalSum) * 100) : 0;
      return {
        finalPrice: Number(fixed.toFixed(2)),
        savings: Number(save.toFixed(2)),
        effectivePct: pct,
      };
    }
  }, [originalSum, pricingMode, discountPercent, fixedComboPrice]);

  const handleAddItem = (productId: string) => {
    setComboItems((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const handleRemoveItem = (productId: string) => {
    setComboItems((prev) => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: current - 1 };
    });
  };

  const handleDeleteItem = (productId: string) => {
    setComboItems((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  // Produtos filtrados na busca
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return availableProducts;
    const q = productSearch.toLowerCase();
    return availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [availableProducts, productSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Informe um título para o combo.");
      return;
    }

    const itemsPayload = Object.entries(comboItems)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (itemsPayload.length < 2) {
      setError("Selecione pelo menos 2 produtos para formar um combo promocional.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: title.trim(),
        description: description.trim(),
        price: finalPrice,
        servesText: servesText.trim() || null,
        category: "Combo Especial",
        isAvailable: isActive,
        isCombo: true,
        comboItems: itemsPayload,
        imageUrl: comboToEdit?.imageUrl || "",
      };

      if (comboToEdit) {
        await productService.updateProduct(comboToEdit.id, payload, file || undefined);
      } else {
        await productService.createProduct(payload, file || undefined);
      }

      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao salvar combo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl sm:max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#200B22] border border-gray-200 dark:border-border/40 text-foreground shadow-2xl space-y-6">
        <DialogHeader className="border-b border-gray-100 dark:border-border/30 pb-4">
          <DialogTitle className="text-xl sm:text-2xl font-heading font-black text-foreground dark:text-foreground flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary dark:text-muted-foreground flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span>{comboToEdit ? "Editar Combo de Produtos" : "Montar Novo Combo de Produtos"}</span>
          </DialogTitle>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Agrupe 2 ou mais produtos com precificação especial e desconto automático na vitrine.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-1">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-300 text-xs sm:text-sm flex items-center gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Nome e Badge do Combo (Grid Flexível 2/3 e 1/3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Título do Combo *
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Duo Galáctico: Açaí 500ml + Pop Shake"
                className="font-medium bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 text-xs sm:text-sm rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Selo do Card (Badge)
              </Label>
              <Select
                value={badge || "none"}
                onValueChange={(val) => setBadge(!val || val === "none" ? "" : val)}
              >
                <SelectTrigger className="font-bold text-xs sm:text-sm bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 rounded-xl">
                  <SelectValue placeholder="Selecione um selo..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-200 dark:border-border/50 bg-white dark:bg-[#1F0B22] shadow-xl max-h-60 z-[60]">
                  <SelectItem value="none" className="cursor-pointer text-sm py-2">
                    <span className="text-muted-foreground">[ Nenhum selo ]</span>
                  </SelectItem>
                  {badges.map((b) => {
                    const badgeValue = b.icon ? `${b.icon} ${b.text}` : b.text;
                    return (
                      <SelectItem key={b.id} value={badgeValue} className="cursor-pointer text-sm py-2 hover:bg-primary/10">
                        <div className="flex items-center gap-2">
                          <span
                            style={{ backgroundColor: b.bgColor, color: b.textColor }}
                            className="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 shadow-2xs"
                          >
                            {b.icon && <span>{b.icon}</span>}
                            <span>{b.text}</span>
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                  {badge && !badges.some((b) => (b.icon ? `${b.icon} ${b.text}` : b.text) === badge) && (
                    <SelectItem value={badge} className="cursor-pointer text-sm py-2">
                      <span>{badge}</span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 2. Descrição */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Descrição do Combo
            </Label>
            <textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Descreva o que acompanha este combo e as vantagens para o cliente..."
              className="w-full rounded-xl p-3 resize-none h-20 text-xs sm:text-sm bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Foto e Rendimento do Combo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50/70 dark:bg-background/60 border border-gray-200/70 dark:border-border/40">
            {/* Upload de Foto */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  Foto do Combo
                </Label>
                <span className="text-[10px] font-semibold text-primary dark:text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  1:1 Quadrado
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-border/50 overflow-hidden relative shrink-0 flex items-center justify-center shadow-xs">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Foto do combo" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-border/60 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-muted/50 cursor-pointer shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>{previewUrl ? "Alterar Foto" : "Escolher Foto"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    JPG, PNG ou WebP até 10MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Rendimento / Serve X Pessoas */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="combo-serves" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Serve X Pessoas
                </Label>
                <span className="text-[10px] text-muted-foreground font-normal">opcional</span>
              </div>
              <Input
                id="combo-serves"
                value={servesText}
                onChange={(e) => setServesText(e.target.value)}
                placeholder="Ex: Serve 2 a 3 pessoas"
                className="h-10 rounded-xl bg-white dark:bg-card border-gray-200 dark:border-border/50 text-xs sm:text-sm font-medium"
              />
              <div className="flex flex-wrap gap-1.5">
                {["Serve 1 a 2 pessoas", "Serve 2 pessoas", "Serve 2 a 3 pessoas", "Serve 3 a 4 pessoas"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setServesText(opt)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-all font-medium ${
                      servesText === opt
                        ? "bg-primary text-white border-primary"
                        : "bg-white dark:bg-card border-gray-200 dark:border-border/50 text-gray-600 dark:text-gray-300 hover:border-primary/50"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Seleção de Produtos para Montagem do Combo */}
          <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-border/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                  Produtos do Combo (Mínimo 2)
                </Label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Adicione e controle as quantidades dos itens que compõem este combo promocional.
                </p>
              </div>
              <span className="text-xs font-bold text-primary dark:text-muted-foreground bg-primary/5 dark:bg-primary/95/40 px-2.5 py-1 rounded-full border border-primary/20 dark:border-primary/90/40 shrink-0 w-fit">
                {Object.keys(comboItems).length} produto(s) no combo
              </span>
            </div>

            {/* Itens Atualmente no Combo */}
            {Object.keys(comboItems).length > 0 ? (
              <div className="bg-primary/5/40 dark:bg-background/80 border border-primary/10 dark:border-border/40 rounded-2xl p-3.5 space-y-2.5">
                {Object.entries(comboItems).map(([pId, qty]) => {
                  const p = productsMap.get(pId);
                  if (!p) return null;
                  const itemSubtotal = Number(p.price) * qty;

                  return (
                    <div
                      key={pId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#230E26] rounded-xl border border-gray-200 dark:border-border/40 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 overflow-hidden shrink-0 border border-gray-200/50 dark:border-white/10">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                              🍦
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                            {p.name}
                          </p>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                            R$ {Number(p.price).toFixed(2).replace(".", ",")} un.
                          </span>
                        </div>
                      </div>

                      {/* Controle de Quantidade e Subtotal */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-border/20 w-full sm:w-auto">
                        <div className="flex items-center bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(pId)}
                            className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Diminuir quantidade"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-mono font-bold text-gray-800 dark:text-gray-200">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddItem(pId)}
                            className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Aumentar quantidade"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="font-mono text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 min-w-[70px] text-right">
                          R$ {itemSubtotal.toFixed(2).replace(".", ",")}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(pId)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                          title="Remover produto do combo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 border border-dashed border-gray-200 dark:border-border/40 rounded-2xl text-center space-y-1 bg-gray-50/50 dark:bg-background/40">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nenhum produto adicionado ainda.
                </p>
                <p className="text-[11px] text-gray-400">
                  Pesquise no catálogo abaixo e clique em &ldquo;Adicionar&rdquo; para montar seu kit.
                </p>
              </div>
            )}

            {/* Busca rápida para adicionar produtos ao combo */}
            <div className="space-y-2 pt-1">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Pesquisar produto pelo nome no cardápio..."
                  className="w-full bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-100 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const inCombo = Boolean(comboItems[p.id]);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2.5 p-2.5 bg-gray-50/80 dark:bg-background/80 border border-gray-200/80 dark:border-border/30 hover:border-primary/40 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 border border-gray-200/50 dark:border-white/10">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                              🍦
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-gray-800 dark:text-gray-200 truncate">
                            {p.name}
                          </p>
                          <span className="font-mono text-gray-500 dark:text-gray-400 text-[11px]">
                            R$ {Number(p.price).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={inCombo ? "secondary" : "outline"}
                        onClick={() => handleAddItem(p.id)}
                        className={`h-8 px-2.5 text-xs rounded-xl shrink-0 gap-1 font-semibold transition-all ${
                          inCombo
                            ? "bg-primary/10 dark:bg-primary/95/60 text-primary dark:text-muted-foreground border border-primary/20/50"
                            : "border-gray-200 dark:border-border/40 hover:border-primary/40"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{inCombo ? "Mais 1" : "Adicionar"}</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Precificação e Economia em Tempo Real (Grid 2 Colunas Limpo) */}
          <div className="bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/60 dark:border-border/30">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                  Regra de Precificação do Combo
                </Label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Defina se o combo aplica desconto percentual ou um preço promocional fixo.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-gray-200/70 dark:bg-black/30 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setPricingMode("percentage")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pricingMode === "percentage"
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  % Desconto
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode("fixed_price")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pricingMode === "fixed_price"
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  R$ Preço Final Fixo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {/* Input de Preço */}
              <div className="bg-white dark:bg-[#200B22] border border-gray-200 dark:border-border/40 rounded-xl p-4 flex flex-col justify-between space-y-3">
                {pricingMode === "percentage" ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                      Percentual de Desconto (%)
                    </Label>
                    <div className="relative">
                      <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <Input
                        type="number"
                        min="1"
                        max="90"
                        step="1"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        placeholder="Ex: 15"
                        className="pl-10 font-mono font-bold text-base bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 rounded-xl"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      O desconto será deduzido automaticamente da soma dos itens avulsos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                      Preço Final do Combo (R$)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      <Input
                        type="number"
                        min="1"
                        step="0.5"
                        value={fixedComboPrice}
                        onChange={(e) => setFixedComboPrice(e.target.value)}
                        placeholder={`Ex: ${(originalSum * 0.85).toFixed(2)}`}
                        className="pl-10 font-mono font-bold text-base bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 rounded-xl"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      O cliente pagará exatamente esse valor final pelo combo fechado.
                    </p>
                  </div>
                )}
              </div>

              {/* Resumo e Simulação Financeira */}
              <div className="bg-white dark:bg-[#200B22] border border-gray-200 dark:border-border/40 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Simulação Financeira do Combo
                  </span>
                  <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                    <span>Soma dos itens avulsos:</span>
                    <span className="font-mono font-semibold line-through text-gray-500">
                      R$ {originalSum.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    <span>Preço Final do Combo:</span>
                    <span className="font-mono text-xl font-black">
                      R$ {finalPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-border/20 flex items-center justify-between text-xs text-primary dark:text-primary/40 font-bold bg-primary/5/60 dark:bg-primary/95/20 p-2.5 rounded-xl">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4" /> Economia do Cliente:
                  </span>
                  <span className="font-mono text-sm">
                    R$ {savings.toFixed(2).replace(".", ",")} ({effectivePct}% OFF)
                  </span>
                </div>
              </div>
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
                {validUntilPreview && (
                  <p className="text-[11px] text-emerald-600 font-medium">
                    Válido até: {validUntilPreview}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDuration}
                    onChange={(e) => setShowDuration(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-gray-300"
                  />
                  <Eye className="w-4 h-4 text-gray-500" />
                  Mostrar Escassez para o Cliente
                </label>
                
                {showDuration && (
                  <div className="bg-gray-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">Formato de Exibição:</p>
                    {[
                      "Cronômetro Regressivo",
                      "Data e Hora Limite Claras",
                      "Contador de Estoque Limitado",
                      "Destaque Visual do Desconto",
                      "Nomeação Temática"
                    ].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={durationDisplay.includes(opt)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDurationDisplay([...durationDisplay, opt]);
                            } else {
                              setDurationDisplay(durationDisplay.filter((d) => d !== opt));
                            }
                          }}
                          className="w-3.5 h-3.5 text-primary rounded border-gray-300"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-border/30">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold uppercase tracking-wider h-11 px-5 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs font-bold uppercase tracking-wider rounded-xl h-11 px-6 shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{comboToEdit ? "Salvar Alterações" : "Criar Combo"}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <ImageCropperDialog
      open={cropModalOpen}
      imageSrc={rawImageSrc}
      aspectRatio={1}
      aspectLabel="1:1 (Quadrado)"
      onCropComplete={handleCropComplete}
      onCancel={handleCropCancel}
    />
  </>
  );
}
