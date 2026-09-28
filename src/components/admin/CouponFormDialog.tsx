"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { productService, Product } from "../../services/productService";
import { couponService, Coupon } from "../../services/couponService";
import {
  Ticket,
  Sparkles,
  Percent,
  DollarSign,
  Search,
  Calendar,
  Layers,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Award,
} from "lucide-react";
import { 
  loyaltyBadgeService, 
  LoyaltyBadgeConfig, 
  DEFAULT_LOYALTY_BADGES 
} from "../../services/loyaltyBadgeService";

interface CouponFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  couponToEdit?: Coupon | null;
}

export function CouponFormDialog({
  open,
  onOpenChange,
  onSaved,
  couponToEdit,
}: CouponFormDialogProps) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [oncePerUser, setOncePerUser] = useState(false);

  // Exigência de Nível de Fidelidade
  const [loyaltyBadges, setLoyaltyBadges] = useState<LoyaltyBadgeConfig[]>(DEFAULT_LOYALTY_BADGES);
  const [selectedLoyaltyBadgeId, setSelectedLoyaltyBadgeId] = useState<string>("");

  // Escopo de Aplicação: all vs specific
  const [scope, setScope] = useState<"all" | "specific">("all");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Carrega lista de produtos e selos de fidelidade
  useEffect(() => {
    productService
      .getProducts()
      .then(setAvailableProducts)
      .catch((err) => console.error("Erro ao carregar produtos para cupons:", err));

    loyaltyBadgeService
      .getBadges()
      .then(setLoyaltyBadges)
      .catch(() => {});
  }, []);

  // Preenche dados ao abrir ou editar
  useEffect(() => {
    if (couponToEdit) {
      setCode(couponToEdit.code);
      setDiscountType(couponToEdit.discountType);
      setDiscountValue(String(couponToEdit.discountValue));
      setMinOrderValue(couponToEdit.minOrderValue ? String(couponToEdit.minOrderValue) : "");
      setMaxUses(couponToEdit.maxUses ? String(couponToEdit.maxUses) : "");

      if (couponToEdit.expiresAt) {
        // Formato para datetime-local (YYYY-MM-DDTHH:mm)
        const d = new Date(couponToEdit.expiresAt);
        const formattedDate = d.toISOString().slice(0, 16);
        setExpiresAt(formattedDate);
      } else {
        setExpiresAt("");
      }

      setIsActive(couponToEdit.isActive);
      setOncePerUser(Boolean(couponToEdit.oncePerUser));

      if (couponToEdit.loyaltyBadgeId) {
        setSelectedLoyaltyBadgeId(couponToEdit.loyaltyBadgeId);
      } else if (couponToEdit.minLoyaltyLevel) {
        const found = loyaltyBadges.find((b) => b.level === couponToEdit.minLoyaltyLevel);
        setSelectedLoyaltyBadgeId(found?.id || String(couponToEdit.minLoyaltyLevel));
      } else {
        setSelectedLoyaltyBadgeId("");
      }

      if (couponToEdit.productIds && couponToEdit.productIds.length > 0) {
        setScope("specific");
        setSelectedProductIds(couponToEdit.productIds);
      } else {
        setScope("all");
        setSelectedProductIds([]);
      }
    } else {
      setCode("");
      setDiscountType("percentage");
      setDiscountValue("10");
      setMinOrderValue("");
      setMaxUses("");
      setExpiresAt("");
      setIsActive(true);
      setOncePerUser(false);
      setSelectedLoyaltyBadgeId("");
      setScope("all");
      setSelectedProductIds([]);
    }
    setError("");
    setProductSearch("");
  }, [couponToEdit, open, loyaltyBadges]);

  // Gerador de código aleatório amigável
  const handleGenerateCode = () => {
    const prefixes = ["POP", "SHAKE", "ACAI", "CLUB", "VIP", "DESCONTO"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}${num}`);
  };

  // Produtos filtrados pela busca
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return availableProducts;
    const q = productSearch.toLowerCase();
    return availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [availableProducts, productSearch]);

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    setSelectedProductIds(filteredProducts.map((p) => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedProductIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Digite ou gere um código para o cupom.");
      return;
    }

    const numDiscount = Number(discountValue);
    if (isNaN(numDiscount) || numDiscount <= 0) {
      setError("Informe um valor de desconto válido maior que zero.");
      return;
    }

    if (discountType === "percentage" && numDiscount > 100) {
      setError("O desconto em porcentagem não pode ultrapassar 100%.");
      return;
    }

    if (scope === "specific" && selectedProductIds.length === 0) {
      setError("Selecione pelo menos um produto específico ou marque 'Todos os produtos da loja'.");
      return;
    }

    setLoading(true);

    try {
      const chosenBadge = loyaltyBadges.find(
        (b) => b.id === selectedLoyaltyBadgeId || String(b.level) === selectedLoyaltyBadgeId
      );

      const payload = {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: numDiscount,
        minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
        maxUses: maxUses ? parseInt(maxUses, 10) : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        isActive,
        oncePerUser: Boolean(oncePerUser),
        productIds: scope === "specific" ? selectedProductIds : [],
        minLoyaltyLevel: chosenBadge ? chosenBadge.level : null,
        loyaltyBadgeId: chosenBadge ? chosenBadge.id : null,
      };

      if (couponToEdit) {
        await couponService.updateCoupon(couponToEdit.id, payload);
      } else {
        await couponService.createCoupon(payload);
      }

      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao salvar cupom.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-[95vw] max-h-[92vh] overflow-y-auto bg-white dark:bg-[#200B22] border-gray-200 dark:border-border/40 text-foreground p-5 sm:p-7 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-gray-100 dark:border-border/30 pb-4">
          <DialogTitle className="text-lg sm:text-xl font-heading font-black text-foreground dark:text-foreground flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            {couponToEdit ? "Editar Cupom de Desconto" : "Criar Novo Cupom de Desconto"}
          </DialogTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Configure código promocional, regras de utilização, validade e escopo de produtos.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-300 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Código do Cupom & Botão Gerar */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Código do Cupom *
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: POPSHAKE10"
                  className="pl-9 font-mono font-bold text-sm tracking-wider uppercase bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11"
                  required
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateCode}
                className="h-11 px-3.5 border-gray-200 dark:border-border/40 text-xs font-bold text-primary hover:bg-primary/5 dark:hover:bg-primary/95/30 flex items-center gap-1.5"
                title="Gerar código aleatório"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gerar</span>
              </Button>
            </div>
          </div>

          {/* 2. Tipo e Valor do Desconto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Tipo de Desconto *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType("percentage")}
                  className={`
                    py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition-all
                    ${
                      discountType === "percentage"
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                    }
                  `}
                >
                  <Percent className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Porcentagem</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDiscountType("fixed")}
                  className={`
                    py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition-all
                    ${
                      discountType === "fixed"
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                    }
                  `}
                >
                  <DollarSign className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Valor Fixo</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {discountType === "percentage" ? "Desconto (%) *" : "Desconto em Reais (R$) *"}
              </Label>
              <Input
                type="number"
                min="0.1"
                step={discountType === "percentage" ? "1" : "0.5"}
                max={discountType === "percentage" ? "100" : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "Ex: 15" : "Ex: 10.00"}
                className="font-mono font-bold bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11"
                required
              />
            </div>
          </div>

          {/* 3. Regras de Validade, Pedido Mínimo e Limites de Uso */}
          <div className="space-y-4">
            {/* Linha 1: Pedido Mínimo e Limite de Usos Geral */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Pedido Mínimo (R$)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  placeholder="0,00 (Opcional)"
                  className="font-mono text-sm bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-10.5 rounded-xl truncate"
                />
                <p className="text-[11px] text-muted-foreground">Valor mínimo para ativar.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Limite de Usos (Total Geral)
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Ilimitado"
                  className="font-mono text-sm bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-10.5 rounded-xl truncate"
                />
                <p className="text-[11px] text-muted-foreground">Máx. de resgates totais.</p>
              </div>
            </div>

            {/* Linha 2: Validade e Limite de 1 Uso por Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Validade do Cupom
                </Label>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="text-xs sm:text-sm bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-10.5 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">Deixe em branco se o cupom não tiver data de expiração.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Regra por Cliente
                </Label>
                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  oncePerUser 
                    ? "bg-primary/5/80 dark:bg-primary/95/30 border-primary shadow-xs"
                    : "bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 hover:border-gray-300 dark:hover:border-border/70"
                }`}>
                  <input
                    type="checkbox"
                    checked={oncePerUser}
                    onChange={(e) => setOncePerUser(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-foreground dark:text-foreground block">
                      Limitar a 1 uso por cliente
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug">
                      Ideal para cupons de boas-vindas e primeira compra
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Linha 3: Exigir Nível Mínimo de Fidelidade */}
            <div className="space-y-1.5 p-3.5 rounded-xl border border-primary/20 bg-primary/5 dark:bg-zinc-900/40">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-primary" />
                Exigir Nível Mínimo de Fidelidade
              </Label>
              <select
                value={selectedLoyaltyBadgeId}
                onChange={(e) => setSelectedLoyaltyBadgeId(e.target.value)}
                className="w-full h-10.5 px-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">Sem restrição (Qualquer cliente cadastrado)</option>
                {loyaltyBadges.map((b) => (
                  <option key={b.id} value={b.id}>
                    A partir de {b.icon} {b.name} ({b.minMonths === 0 ? "Novo membro" : `${b.minMonths} ${b.minMonths === 1 ? "mês" : "meses"}`})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                O cliente precisará atingir este selo (ou superior) pelo tempo de conta para conseguir aplicar o cupom no checkout.
              </p>
            </div>
          </div>

          {/* 4. Escopo de Aplicação Flexível */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-border/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" />
                Escopo de Aplicação do Desconto
              </Label>
              <span className="text-[11px] font-medium text-gray-500">
                {scope === "all" ? "Aplica em todos os produtos" : `${selectedProductIds.length} produto(s) selecionado(s)`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`
                  p-3 rounded-xl border text-left transition-all
                  ${
                    scope === "all"
                      ? "bg-primary/5/70 dark:bg-primary/95/30 border-primary text-foreground dark:text-foreground"
                      : "bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${scope === "all" ? "border-primary bg-primary" : "border-gray-400"}`}>
                    {scope === "all" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className="text-xs font-bold">Toda a Loja</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1 pl-6">
                  Válido para qualquer item do cardápio.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setScope("specific")}
                className={`
                  p-3 rounded-xl border text-left transition-all
                  ${
                    scope === "specific"
                      ? "bg-primary/5/70 dark:bg-primary/95/30 border-primary text-foreground dark:text-foreground"
                      : "bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${scope === "specific" ? "border-primary bg-primary" : "border-gray-400"}`}>
                    {scope === "specific" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className="text-xs font-bold">Produtos Específicos</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1 pl-6">
                  Restringe o cupom a itens selecionados.
                </p>
              </button>
            </div>

            {/* Listagem de produtos para seleção restrita */}
            {scope === "specific" && (
              <div className="bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Filtrar por nome ou categoria..."
                      className="w-full bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] font-bold text-primary hover:underline px-1.5 py-1"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-gray-300 dark:text-gray-700">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[11px] font-bold text-gray-500 hover:underline px-1.5 py-1"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100 dark:divide-border/20">
                  {filteredProducts.map((p) => {
                    const isChecked = selectedProductIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`
                          flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors
                          ${isChecked ? "bg-primary/10/50 dark:bg-primary/90/30" : "hover:bg-white dark:hover:bg-white/5"}
                        `}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProduct(p.id)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary/30 border-gray-300 dark:border-border"
                          />
                          <div className="w-7 h-7 rounded-md bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0">
                            {p.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                              {p.name}
                            </p>
                            {p.category && (
                              <span className="text-[9px] text-primary dark:text-primary/40">
                                {p.category}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-300 shrink-0 ml-2">
                          R$ {Number(p.price).toFixed(2).replace(".", ",")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 5. Ativo / Inativo Switch */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-border/30">
            <div>
              <span className="text-xs font-bold text-foreground dark:text-foreground block">
                Status do Cupom
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {isActive ? "Disponível para os clientes utilizarem no checkout." : "Desativado temporariamente."}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out
                ${isActive ? "bg-[#35A340]" : "bg-gray-300 dark:bg-gray-700"}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out
                  ${isActive ? "translate-x-5" : "translate-x-0"}
                `}
              />
            </button>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-border/30">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold uppercase tracking-wider h-11 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs font-bold uppercase tracking-wider rounded-xl h-11 px-6 shadow-md shadow-primary/20 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{couponToEdit ? "Salvar Alterações" : "Criar Cupom"}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
