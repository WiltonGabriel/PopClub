"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Plus,
  Minus,
  Check,
  Sparkles,
  ShoppingBag,
  Clock,
  ShieldCheck,
  Tag,
  Utensils,
  Loader2,
  Users,
} from "lucide-react";
import { Product, productService } from "../../services/productService";
import { AddonGroup, AddonItem } from "../../services/addonService";
import { SelectedOption } from "../../contexts/CartContext";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../ui/ToastNotification";
import { formatCurrency, parseSafeNumber } from "@/lib/formatters";
import { calculateProductPrice } from "@/lib/pricing";

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
}: ProductDetailModalProps) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  // Record<groupId, itemId[]>
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});

  const initSelections = useCallback((addonGroups: AddonGroup[]) => {
    const initial: Record<string, string[]> = {};
    addonGroups.forEach((group) => {
      // Se for obrigatório de escolha única (min=1, max=1), pré-seleciona a 1ª opção disponível
      if (group.isRequired && group.minQuantity === 1 && group.maxQuantity === 1) {
        const firstAvail = group.items.find((i) => i.isAvailable);
        if (firstAvail) {
          initial[group.id] = [firstAvail.id];
          return;
        }
      }
      initial[group.id] = [];
    });
    setSelectedOptions(initial);
  }, []);

  // Carrega os grupos reais associados ao produto via API
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setNotes("");

      if (product.addonGroups && product.addonGroups.length > 0) {
        setGroups(product.addonGroups);
        initSelections(product.addonGroups);
      } else {
        setLoadingAddons(true);
        productService
          .getProductById(product.id)
          .then((fullProduct) => {
            const loadedGroups = fullProduct.addonGroups || [];
            setGroups(loadedGroups);
            initSelections(loadedGroups);
          })
          .catch((err) => {
            console.warn("Aviso ao carregar complementos reais do produto:", err);
            setGroups([]);
          })
          .finally(() => {
            setLoadingAddons(false);
          });
      }
    } else {
      setGroups([]);
      setSelectedOptions({});
    }
  }, [isOpen, product, initSelections]);

  // Bloqueio do scroll da página quando modal aberto
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Fechar com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  // Lógica de Seleção / Toggle de Opção
  const handleToggleOption = (group: AddonGroup, item: AddonItem) => {
    if (!item.isAvailable) return;

    const current = selectedOptions[group.id] || [];
    const isSingle = group.maxQuantity === 1;

    // Escolha única (Radio)
    if (isSingle) {
      if (current.includes(item.id)) {
        // Se for obrigatório, não permite desmarcar deixando 0
        if (group.isRequired && group.minQuantity >= 1) return;
        setSelectedOptions((prev) => ({ ...prev, [group.id]: [] }));
      } else {
        setSelectedOptions((prev) => ({ ...prev, [group.id]: [item.id] }));
      }
      return;
    }

    // Múltipla escolha (Checkbox)
    if (current.includes(item.id)) {
      setSelectedOptions((prev) => ({
        ...prev,
        [group.id]: current.filter((id) => id !== item.id),
      }));
    } else {
      if (current.length < group.maxQuantity) {
        setSelectedOptions((prev) => ({
          ...prev,
          [group.id]: [...current, item.id],
        }));
      }
    }
  };

  // Cálculo de Preço Reativo e Snapshot de Adicionais
  const pricing = calculateProductPrice(product);
  const basePrice = pricing.currentPrice;
  const baseOriginalPrice = pricing.originalPrice;
  let extrasTotal = 0;
  const flatSelectedOptionsList: SelectedOption[] = [];

  groups.forEach((group) => {
    const selectedIds = selectedOptions[group.id] || [];
    const freeQuota = group.freeQuantity || 0;

    selectedIds.forEach((id, index) => {
      const item = group.items.find((i) => i.id === id);
      if (item) {
        // Os primeiros `freeQuota` itens selecionados no grupo têm custo 0
        const itemPrice = parseSafeNumber(item.price);
        const isFree = index < freeQuota || itemPrice === 0;
        const effectivePrice = isFree ? 0 : itemPrice;
        extrasTotal += effectivePrice;

        flatSelectedOptionsList.push({
          id: item.id,
          groupName: group.name,
          name: item.name,
          price: effectivePrice,
          quantity: 1,
        });
      }
    });
  });

  const unitPrice = basePrice + extrasTotal;
  const totalPrice = unitPrice * quantity;
  const isPromo = pricing.isPromotional;
  const originalUnitPrice = isPromo ? baseOriginalPrice + extrasTotal : undefined;

  // Validação de grupos obrigatórios e mínimos
  const unsatisfiedRequiredGroups = groups.filter((group) => {
    const count = (selectedOptions[group.id] || []).length;
    const minRequired = group.isRequired ? Math.max(1, group.minQuantity) : group.minQuantity;
    return count < minRequired;
  });

  const isValid = unsatisfiedRequiredGroups.length === 0;

  // Adicionar ao Carrinho
  const handleAddToCart = () => {
    if (!isValid) return;

    addItem({
      productId: product.id,
      name: product.name,
      price: Number(unitPrice.toFixed(2)),
      originalPrice: Number((originalUnitPrice || unitPrice).toFixed(2)),
      quantity,
      imageUrl: product.imageUrl,
      selectedOptions: flatSelectedOptionsList,
      notes: notes.trim() || undefined,
    });

    showToast({
      title: "Adicionado ao Carrinho! 🛍️",
      message: `${quantity}x ${product.name} foi colocado na sua sacola.`,
      type: "success",
    });

    onClose();
  };

  const isOutOfStock =
    product.isAvailable === false ||
    (product.stock !== undefined && product.stock !== null && product.stock <= 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop com Blur */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card / Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-product-title"
        className="
          relative w-full md:max-w-4xl lg:max-w-5xl h-[90dvh] max-h-[90dvh] md:h-auto md:max-h-[88dvh]
          bg-white dark:bg-[#181D2D] text-foreground
          border-t md:border border-gray-200 dark:border-zinc-800
          rounded-t-[28px] md:rounded-3xl shadow-2xl
          flex flex-col md:flex-row overflow-hidden
          z-10 animate-in slide-in-from-bottom duration-300 md:zoom-in-95 md:duration-200
        "
      >
        {/* Barra de Pega / Drag Handle no Mobile */}
        <div className="md:hidden pt-2.5 pb-1 bg-white dark:bg-[#181D2D] shrink-0 flex justify-center">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Botão Fechar Flutuante */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar detalhes do produto"
          className="
            absolute top-3 right-3 sm:top-4 sm:right-4 z-30
            w-9 h-9 rounded-full
            bg-black/50 hover:bg-black/70 dark:bg-white/20 dark:hover:bg-white/30
            text-white backdrop-blur-md
            flex items-center justify-center
            transition-transform duration-150 active:scale-95 shadow-md cursor-pointer
          "
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── COLUNA ESQUERDA (Foto e Badges) ── */}
        <div className="w-full md:w-1/2 h-44 sm:h-52 md:h-auto md:min-h-[440px] relative bg-muted/40 shrink-0 overflow-hidden">
          {product.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover object-center md:rounded-l-3xl"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/20 md:rounded-l-3xl">
              <span className="font-heading font-black text-6xl text-primary dark:text-violet-400">
                {product.name[0]}
              </span>
            </div>
          )}

          {/* Gradiente sutil */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none md:bg-gradient-to-t md:from-black/40 md:via-transparent md:to-black/20" />

          {/* Badges Sobrepostas */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex flex-wrap gap-2 pointer-events-none">
            {isPromo && (
              <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                Oferta Especial
              </span>
            )}
            {product.category && (
              <span className="inline-flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-foreground font-semibold text-[11px] px-2.5 py-1 rounded-full shadow-sm border border-white/20">
                <Tag className="w-3 h-3 text-primary" />
                {product.category}
              </span>
            )}
          </div>

          {/* Selo do Card */}
          {product.cardBadge && (
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 pointer-events-none">
              <span
                style={{
                  backgroundColor: product.cardBadge.bgColor,
                  color: product.cardBadge.textColor,
                }}
                className="rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                {product.cardBadge.icon && <span>{product.cardBadge.icon}</span>}
                <span>{product.cardBadge.text}</span>
              </span>
            </div>
          )}

          {/* Badge de Pronta Entrega */}
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 flex items-center gap-2 text-white text-xs font-medium drop-shadow pointer-events-none">
            <span className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Preparo em ~15 min
            </span>
            <span className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-primary/80" />
              Embalagem Selada
            </span>
          </div>
        </div>

        {/* ── COLUNA DIREITA (Informações e Grupos de Complementos Reais) ── */}
        <div className="w-full md:w-1/2 flex flex-col flex-1 min-h-0 bg-white dark:bg-[#181D2D] overflow-hidden">
          {/* Painel Rolável */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-6 scrollbar-thin pb-32 md:pb-8">
            {/* Cabeçalho do Produto */}
            <div className="space-y-2 border-b border-gray-100 dark:border-zinc-800 pb-4">
              <div className="flex flex-col gap-1.5">
                {product.servesText && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary dark:text-violet-300 text-xs font-semibold w-fit">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{product.servesText}</span>
                  </div>
                )}
                <h2
                  id="modal-product-title"
                  className="font-heading font-black text-xl sm:text-2xl text-foreground leading-tight"
                >
                  {product.name}
                </h2>
              </div>

              {/* Preços */}
              <div className="flex items-baseline gap-2.5 pt-1">
                {originalUnitPrice ? (
                  <>
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground line-through">
                      De {formatCurrency(originalUnitPrice)}
                    </span>
                    <span className="font-heading font-black text-xl sm:text-2xl text-primary dark:text-violet-400">
                      por {formatCurrency(unitPrice)}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Economize {formatCurrency(originalUnitPrice - unitPrice)}
                    </span>
                  </>
                ) : (
                  <span className="font-heading font-black text-xl sm:text-2xl text-primary dark:text-violet-400">
                    {formatCurrency(unitPrice)}
                  </span>
                )}
              </div>

              {product.description && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
                  {product.description}
                </p>
              )}
            </div>

            {/* GRUPOS REAIS DE COMPLEMENTOS VINCULADOS */}
            {loadingAddons ? (
              <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs">Carregando adicionais disponíveis...</span>
              </div>
            ) : groups.length === 0 ? null : (
              <div className="space-y-5">
                {groups.map((group) => {
                  const selectedInGroup = selectedOptions[group.id] || [];
                  const currentCount = selectedInGroup.length;
                  const isSingleChoice = group.maxQuantity === 1;
                  const minReq = group.isRequired ? Math.max(1, group.minQuantity) : group.minQuantity;
                  const isSatisfied = currentCount >= minReq;
                  const freeQuota = group.freeQuantity || 0;

                  return (
                    <section
                      key={group.id}
                      className="border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3"
                    >
                      {/* Cabeçalho do Grupo com Hierarquia Vertical Padrão iFood */}
                      <div className="space-y-1.5">
                        {/* Linha Superior: Nome do Grupo e Badge de Obrigatoriedade */}
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-heading font-bold text-base text-foreground leading-snug">
                            {group.name}
                          </h3>

                          {minReq >= 1 ? (
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0 ${
                                isSatisfied
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
                              }`}
                            >
                              {isSatisfied ? "Obrigatório" : `Obrigatório • Escolha ${minReq}`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-zinc-200 dark:border-zinc-700/60 shrink-0">
                              Opcional
                            </span>
                          )}
                        </div>

                        {/* Linha Intermediária: Badges Flexíveis (Contador e Benefício) */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {currentCount} de {group.maxQuantity} selecionado{group.maxQuantity === 1 ? "" : "s"}
                          </span>

                          {freeQuota > 0 && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              Até {freeQuota} incluso{freeQuota === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>

                        {/* Linha Inferior: Descrição em largura total */}
                        {group.description && (
                          <p className="w-full text-xs text-muted-foreground pt-0.5 leading-relaxed">
                            {group.description}
                          </p>
                        )}
                      </div>

                      {/* Lista de Opções do Grupo */}
                      <div className="space-y-2">
                        {group.items.map((item) => {
                          const isSelected = selectedInGroup.includes(item.id);
                          const isMaxReached =
                            !isSelected && !isSingleChoice && currentCount >= group.maxQuantity;
                          const isPaused = !item.isAvailable;

                          // Preço formatado dinamicamente: se selecionado e dentro da cota grátis, é Incluso!
                          const selectedIndex = selectedInGroup.indexOf(item.id);

                          const itemPrice = parseSafeNumber(item.price);
                          let priceDisplay = "Incluso";
                          let priceColor = "text-emerald-600 dark:text-emerald-400 font-bold";

                          if (itemPrice > 0) {
                            if (isSelected && selectedIndex < freeQuota) {
                              priceDisplay = "Incluso";
                              priceColor = "text-emerald-600 dark:text-emerald-400 font-bold";
                            } else if (!isSelected && currentCount < freeQuota) {
                              priceDisplay = "Incluso";
                              priceColor = "text-emerald-600 dark:text-emerald-400 font-bold";
                            } else {
                              priceDisplay = `+ ${formatCurrency(itemPrice)}`;
                              priceColor = "text-primary dark:text-violet-400 font-bold font-mono";
                            }
                          }

                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={isPaused || isMaxReached}
                              onClick={() => handleToggleOption(group, item)}
                              className={`
                                w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl
                                border transition-all text-left gap-3
                                ${
                                  isPaused
                                    ? "border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/30 opacity-50 cursor-not-allowed"
                                    : isSelected
                                    ? "border-primary bg-primary/8 dark:bg-primary/15 shadow-2xs"
                                    : isMaxReached
                                    ? "border-transparent opacity-40 cursor-not-allowed bg-transparent"
                                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181D2D] hover:border-primary/40 cursor-pointer shadow-2xs"
                                }
                              `}
                            >
                              {/* Miniatura WebP 40x40 px + Seletor + Nome */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Miniatura 40x40 px com cantos arredondados */}
                                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-border/50 shrink-0 overflow-hidden flex items-center justify-center">
                                  {item.imageUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Utensils className="w-4 h-4 text-muted-foreground/50" />
                                  )}
                                </div>

                                {/* Checkbox / Radio Visual */}
                                <div
                                  className={`w-4 h-4 rounded-${
                                    isSingleChoice ? "full" : "md"
                                  } border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? "border-primary bg-primary text-white"
                                      : "border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                                  }`}
                                >
                                  {isSelected && (
                                    isSingleChoice ? (
                                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    ) : (
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    )
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p
                                    className={`text-xs sm:text-sm font-semibold truncate ${
                                      isSelected
                                        ? "text-primary dark:text-violet-300"
                                        : "text-zinc-900 dark:text-zinc-100"
                                    }`}
                                  >
                                    {item.name}
                                  </p>
                                </div>
                              </div>

                              {/* Lado Direito: Preço ou Esgotado */}
                              <div className="shrink-0 text-right ml-2">
                                {isPaused ? (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                                    Esgotado
                                  </span>
                                ) : (
                                  <span className={`text-xs ${priceColor}`}>{priceDisplay}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {/* Observações do Pedido */}
            <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="kitchen-notes"
                  className="font-heading font-bold text-xs sm:text-sm text-foreground"
                >
                  Observações para a Cozinha
                </label>
                <span className="text-[11px] font-mono text-muted-foreground">{notes.length}/140</span>
              </div>
              <textarea
                id="kitchen-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 140))}
                maxLength={140}
                rows={2}
                placeholder="Ex: Enviar pouco leite condensado, caprichar na paçoca..."
                className="
                  w-full rounded-xl p-3 text-base md:text-sm
                  bg-white dark:bg-zinc-800/80
                  border border-gray-200 dark:border-zinc-700
                  text-foreground placeholder:text-muted-foreground
                  outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60
                  transition-all resize-none
                "
              />
            </div>
          </div>

          {/* ── RODAPÉ FIXO: Quantidade & Adicionar ao Pedido ── */}
          <div className="
            fixed bottom-0 left-0 right-0 p-3.5 sm:p-4
            pb-[calc(1rem+env(safe-area-inset-bottom,0px))]
            bg-white/95 dark:bg-[#181D2D]/95 backdrop-blur-md
            border-t border-gray-200 dark:border-zinc-800 z-50
            md:relative md:bottom-auto md:p-4 md:z-auto md:pb-4
            shrink-0 flex items-center gap-3
          ">
            {/* Contador de Quantidade */}
            <div className="flex items-center border border-gray-200 dark:border-zinc-700 rounded-full bg-gray-50 dark:bg-zinc-800 p-1 shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Diminuir quantidade"
                className="
                  w-8 h-8 rounded-full flex items-center justify-center
                  text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-zinc-700
                  disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer
                "
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span className="w-8 text-center font-heading font-black text-sm text-foreground select-none">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Aumentar quantidade"
                className="
                  w-8 h-8 rounded-full flex items-center justify-center
                  text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-zinc-700
                  transition-all cursor-pointer
                "
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Botão Adicionar ao Pedido */}
            <button
              type="button"
              disabled={!isValid || isOutOfStock}
              onClick={handleAddToCart}
              className={`
                flex-1 h-12 px-4 py-2.5 rounded-full flex items-center justify-between font-semibold text-sm sm:text-base whitespace-nowrap shadow-md hover:brightness-105 transition-all
                ${
                  !isValid || isOutOfStock
                    ? "bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed border border-dashed border-gray-300 dark:border-zinc-700"
                    : "bg-gradient-to-r from-primary to-accent text-white active:scale-[0.98] cursor-pointer shadow-primary/25"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>
                  {isOutOfStock
                    ? "Item Esgotado"
                    : !isValid
                    ? `Selecione: ${unsatisfiedRequiredGroups[0]?.name || "Obrigatórios"}`
                    : "Adicionar"}
                </span>
              </span>

              <span className="font-mono font-black text-sm sm:text-base shrink-0 ml-2">
                • {formatCurrency(totalPrice)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
