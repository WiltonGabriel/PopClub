"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { productService, Product } from "../../services/productService";
import { promotionService, Promotion } from "../../services/promotionService";
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Percent,
  DollarSign,
  Search,
  Check,
  AlertCircle,
  Loader2,
  TrendingDown,
} from "lucide-react";

interface ComboFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  comboToEdit?: Promotion | null;
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

  // Produtos do combo: { [productId]: quantity }
  const [comboItems, setComboItems] = useState<{ [productId: string]: number }>({});
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    productService
      .getProducts()
      .then(setAvailableProducts)
      .catch((err) => console.error("Erro ao carregar produtos:", err));
  }, []);

  useEffect(() => {
    if (comboToEdit) {
      setTitle(comboToEdit.title);
      setBadge(comboToEdit.badge || "COMBO POP");
      setDescription(comboToEdit.description || "");
      setIsActive(comboToEdit.isActive);

      const itemsMap: { [productId: string]: number } = {};
      comboToEdit.items?.forEach((it) => {
        itemsMap[it.productId] = it.quantity;
      });
      setComboItems(itemsMap);

      if (comboToEdit.discountType === "percentage") {
        setPricingMode("percentage");
        setDiscountPercent(String(comboToEdit.discountValue));
        setFixedComboPrice("");
      } else {
        setPricingMode("percentage"); // default fallback
        setDiscountPercent("15");
      }
    } else {
      setTitle("");
      setBadge("COMBO POP");
      setDescription("");
      setPricingMode("percentage");
      setDiscountPercent("15");
      setFixedComboPrice("");
      setIsActive(true);
      setComboItems({});
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
      // Calcula desconto para salvar
      let discountType: "percentage" | "fixed" = "percentage";
      let discountValue = effectivePct;

      if (pricingMode === "fixed_price") {
        discountType = "fixed";
        discountValue = savings;
      }

      const payload = {
        title: title.trim(),
        badge: badge.trim() || "COMBO POP",
        description: description.trim(),
        gradientStart: "#9306CF",
        gradientEnd: "#940068",
        bannerImageUrl: "",
        discountType,
        discountValue,
        isActive,
        items: itemsPayload,
      };

      if (comboToEdit) {
        await promotionService.updatePromotion(comboToEdit.id, payload);
      } else {
        await promotionService.createPromotion(payload);
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao salvar combo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40 text-foreground p-5 sm:p-7 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-gray-100 dark:border-[#512B54]/30 pb-4">
          <DialogTitle className="text-lg sm:text-xl font-heading font-black text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-[#9306CF]" />
            {comboToEdit ? "Editar Combo de Produtos" : "Montar Novo Combo de Produtos"}
          </DialogTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Agrupe 2 ou mais produtos com precificação especial e desconto automático na vitrine.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-300 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Nome e Badge do Combo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Título do Combo *
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Duo Galáctico: Açaí 500ml + Pop Shake"
                className="font-medium bg-gray-50 dark:bg-[#190B1A] border-gray-200 dark:border-[#512B54]/40 h-11 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Badge Promocional
              </Label>
              <Input
                value={badge}
                onChange={(e) => setBadge(e.target.value.toUpperCase())}
                placeholder="Ex: COMBO POP"
                className="font-bold text-xs bg-gray-50 dark:bg-[#190B1A] border-gray-200 dark:border-[#512B54]/40 h-11"
              />
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
              className="w-full rounded-xl p-3 resize-none h-18 text-xs bg-gray-50 dark:bg-[#190B1A] border border-gray-200 dark:border-[#512B54]/40 outline-none focus:border-[#9306CF]"
            />
          </div>

          {/* 3. Seleção de Produtos para Montagem do Combo */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-[#512B54]/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4 text-[#9306CF]" />
                Produtos do Combo (Mínimo 2)
              </Label>
              <span className="text-[11px] font-medium text-gray-500">
                {Object.keys(comboItems).length} produto(s) adicionado(s)
              </span>
            </div>

            {/* Itens Atualmente no Combo */}
            {Object.keys(comboItems).length > 0 ? (
              <div className="bg-purple-50/50 dark:bg-[#1A0B1C] border border-purple-100 dark:border-[#512B54]/40 rounded-xl p-3 space-y-2">
                {Object.entries(comboItems).map(([pId, qty]) => {
                  const p = productsMap.get(pId);
                  if (!p) return null;
                  const itemSubtotal = Number(p.price) * qty;

                  return (
                    <div
                      key={pId}
                      className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-[#230E26] rounded-xl border border-gray-200 dark:border-[#512B54]/40 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 overflow-hidden shrink-0">
                          {p.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                            {p.name}
                          </p>
                          <span className="text-[10px] text-gray-400 font-mono">
                            R$ {Number(p.price).toFixed(2).replace(".", ",")} un.
                          </span>
                        </div>
                      </div>

                      {/* Controle de Quantidade */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-gray-50 dark:bg-[#190B1A] border border-gray-200 dark:border-[#512B54]/40 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(pId)}
                            className="p-1 text-gray-500 hover:text-black dark:hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono font-bold">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddItem(pId)}
                            className="p-1 text-gray-500 hover:text-black dark:hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300 w-16 text-right">
                          R$ {itemSubtotal.toFixed(2).replace(".", ",")}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(pId)}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                          title="Remover produto do combo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-gray-200 dark:border-[#512B54]/40 rounded-xl text-center text-xs text-gray-400">
                Nenhum produto adicionado ainda. Pesquise e adicione itens abaixo.
              </div>
            )}

            {/* Busca rápida para adicionar produtos ao combo */}
            <div className="space-y-1.5 pt-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar produto para adicionar ao combo..."
                  className="w-full bg-gray-50 dark:bg-[#190B1A] border border-gray-200 dark:border-[#512B54]/40 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-[#9306CF]"
                />
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-gray-100 dark:divide-[#512B54]/20 pr-1">
                {filteredProducts.map((p) => {
                  const inCombo = Boolean(comboItems[p.id]);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0">
                          {p.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">
                          {p.name}
                        </span>
                        <span className="font-mono text-gray-400 text-[11px] shrink-0">
                          (R$ {Number(p.price).toFixed(2).replace(".", ",")})
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={inCombo ? "secondary" : "outline"}
                        onClick={() => handleAddItem(p.id)}
                        className="h-7 px-2 text-[11px] rounded-lg gap-1 border-gray-200 dark:border-[#512B54]/40"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{inCombo ? "Mais 1" : "Adicionar"}</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Precificação e Economia em Tempo Real */}
          <div className="bg-gray-50 dark:bg-[#190B1A] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Regra de Precificação do Combo
              </Label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPricingMode("percentage")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    pricingMode === "percentage"
                      ? "bg-[#9306CF] text-white"
                      : "text-gray-500 hover:text-foreground"
                  }`}
                >
                  % Desconto
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode("fixed_price")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    pricingMode === "fixed_price"
                      ? "bg-[#9306CF] text-white"
                      : "text-gray-500 hover:text-foreground"
                  }`}
                >
                  R$ Preço Final Fixo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                {pricingMode === "percentage" ? (
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-500 block">Percentual de Desconto</span>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        max="90"
                        step="1"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        placeholder="Ex: 15"
                        className="pl-9 font-mono font-bold text-sm bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40 h-10"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-500 block">Preço Final do Combo (R$)</span>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        step="0.5"
                        value={fixedComboPrice}
                        onChange={(e) => setFixedComboPrice(e.target.value)}
                        placeholder={`Ex: ${(originalSum * 0.85).toFixed(2)}`}
                        className="pl-9 font-mono font-bold text-sm bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40 h-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Resumo da Precificação */}
              <div className="bg-white dark:bg-[#200B22] border border-gray-200 dark:border-[#512B54]/40 rounded-xl p-3 space-y-1 text-xs">
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>Preço Original dos Itens:</span>
                  <span className="font-mono line-through">
                    R$ {originalSum.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                  <span>Preço Final do Combo:</span>
                  <span className="font-mono text-base font-black">
                    R$ {finalPrice.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-purple-600 dark:text-purple-400 font-semibold pt-1 border-t border-gray-100 dark:border-[#512B54]/20">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Economia do Cliente:
                  </span>
                  <span className="font-mono">
                    R$ {savings.toFixed(2).replace(".", ",")} ({effectivePct}% OFF)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#512B54]/30">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold uppercase tracking-wider h-11 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs font-bold uppercase tracking-wider rounded-xl h-11 px-6 shadow-md shadow-[#9306CF]/20 flex items-center gap-2"
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
  );
}
