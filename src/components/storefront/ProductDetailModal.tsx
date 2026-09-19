"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Minus,
  Check,
  Sparkles,
  Info,
  ShoppingBag,
  Clock,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { Product } from "../../services/productService";
import { SelectedOption } from "../../contexts/CartContext";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../ui/ToastNotification";
import {
  getProductCustomization,
  CustomizationGroup,
  CustomizationOptionItem,
} from "../../data/productCustomizationOptions";

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
  // Record<groupId, optionId[]>
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});

  // Obter configuração de customização para o produto
  const config = useMemo(() => {
    if (!product) return null;
    return getProductCustomization(product);
  }, [product]);

  // Inicializa seleções e reseta estado quando o modal abre ou produto muda
  useEffect(() => {
    if (isOpen && product && config) {
      setQuantity(1);
      setNotes("");

      // Pré-selecionar opções obrigatórias padrão (estilo iFood)
      const initialSelections: Record<string, string[]> = {};
      config.groups.forEach((group) => {
        if (group.required && group.min === 1 && group.max === 1 && group.options.length > 0) {
          // Seleciona a primeira opção ou a popular como padrão
          const defaultOpt = group.options.find((o) => o.isPopular) || group.options[0];
          initialSelections[group.id] = [defaultOpt.id];
        } else {
          initialSelections[group.id] = [];
        }
      });
      setSelectedOptions(initialSelections);
    }
  }, [isOpen, product, config]);

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

  if (!isOpen || !product || !config) return null;

  // Lógica de seleção
  const handleToggleOption = (group: CustomizationGroup, option: CustomizationOptionItem) => {
    const current = selectedOptions[group.id] || [];

    // Escolha única (Radio)
    if (group.max === 1) {
      setSelectedOptions((prev) => ({
        ...prev,
        [group.id]: [option.id],
      }));
      return;
    }

    // Múltipla escolha com limite
    if (current.includes(option.id)) {
      // Desmarca
      setSelectedOptions((prev) => ({
        ...prev,
        [group.id]: current.filter((id) => id !== option.id),
      }));
    } else {
      // Marca se não atingiu o limite
      if (current.length < group.max) {
        setSelectedOptions((prev) => ({
          ...prev,
          [group.id]: [...current, option.id],
        }));
      }
    }
  };

  // Cálculo de Preço Reativo
  const basePrice = product.price;

  // Preço dos adicionais selecionados
  let extrasTotal = 0;
  const flatSelectedOptionsList: SelectedOption[] = [];

  config.groups.forEach((group) => {
    const selectedIds = selectedOptions[group.id] || [];
    selectedIds.forEach((id) => {
      const opt = group.options.find((o) => o.id === id);
      if (opt) {
        extrasTotal += opt.price;
        flatSelectedOptionsList.push({
          groupName: group.name,
          name: opt.name,
          price: opt.price,
        });
      }
    });
  });

  const unitPrice = basePrice + extrasTotal;
  const totalPrice = unitPrice * quantity;

  // Validação de grupos obrigatórios
  const unsatisfiedRequiredGroups = config.groups.filter((group) => {
    if (!group.required) return false;
    const count = (selectedOptions[group.id] || []).length;
    return count < group.min;
  });

  const isValid = unsatisfiedRequiredGroups.length === 0;

  // Adicionar ao Carrinho
  const handleAddToCart = () => {
    if (!isValid) return;

    addItem({
      productId: product.id,
      name: product.name,
      price: Number(unitPrice.toFixed(2)),
      originalPrice: Number(unitPrice.toFixed(2)),
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

      {/* Modal Card / Bottom Sheet (Mobile-first Drawer / Desktop 2-Column Dialog) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-product-title"
        className="
          relative w-full md:max-w-4xl lg:max-w-5xl h-[92vh] md:h-auto md:max-h-[85vh]
          bg-white dark:bg-[#1E0E21] text-foreground
          border-t md:border border-gray-200 dark:border-[#512B54]/40
          rounded-t-[28px] md:rounded-3xl shadow-2xl
          flex flex-col md:flex-row overflow-hidden
          z-10 animate-in slide-in-from-bottom duration-300 md:zoom-in-95 md:duration-200
        "
      >
        {/* Barra de Pega / Drag Handle no Mobile */}
        <div className="md:hidden pt-2.5 pb-1 bg-white dark:bg-[#1E0E21] shrink-0 flex justify-center">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Botão Fechar Flutuante */}
        <button
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

        {/* ── COLUNA ESQUERDA (50% no Desktop, Capa Panorâmica no Mobile): Foto e Tags ── */}
        <div className="w-full md:w-1/2 h-44 sm:h-52 md:h-auto md:min-h-[440px] relative bg-muted/40 shrink-0 overflow-hidden">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover object-center md:rounded-l-3xl"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#9306CF]/10 to-[#940068]/20 md:rounded-l-3xl">
              <span className="font-heading font-black text-6xl gradient-text-brand">
                {product.name[0]}
              </span>
            </div>
          )}

          {/* Gradiente sutil para garantir legibilidade de badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none md:bg-gradient-to-t md:from-black/40 md:via-transparent md:to-black/20" />

          {/* Badges e Tags Sobrepostas */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex flex-wrap gap-2 pointer-events-none">
            {config.promotionalTag && (
              <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                {config.promotionalTag}
              </span>
            )}
            {product.category && (
              <span className="inline-flex items-center gap-1 bg-white/90 dark:bg-[#230E26]/90 backdrop-blur-md text-[#4C264F] dark:text-[#F9F5F9] font-semibold text-[11px] px-2.5 py-1 rounded-full shadow-sm border border-white/20">
                <Tag className="w-3 h-3 text-[#9306CF]" />
                {product.category}
              </span>
            )}
          </div>

          {/* Selo do Card no Canto Superior Direito */}
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

          {/* Badge de Pronta Entrega no rodapé da imagem */}
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 flex items-center gap-2 text-white text-xs font-medium drop-shadow pointer-events-none">
            <span className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Preparo em ~15 min
            </span>
            <span className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
              Embalagem Selada
            </span>
          </div>
        </div>

        {/* ── COLUNA DIREITA (50% no Desktop, Corpo no Mobile): Informações & Grupos ── */}
        <div className="w-full md:w-1/2 flex flex-col flex-1 min-h-0 bg-white dark:bg-[#1E0E21]">
          {/* Painel Rolável */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin pb-28 md:pb-6">
            {/* Cabeçalho do Produto */}
            <div className="space-y-2 border-b border-gray-100 dark:border-[#512B54]/30 pb-4">
              <div className="flex items-start justify-between gap-3">
                <h2
                  id="modal-product-title"
                  className="font-heading font-black text-xl sm:text-2xl text-[#4C264F] dark:text-[#F9F5F9] leading-tight"
                >
                  {product.name}
                </h2>
              </div>

              {/* Preços (Promocional vs Base) */}
              <div className="flex items-baseline gap-2.5 pt-1">
                {config.originalPrice ? (
                  <>
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground line-through">
                      De R$ {config.originalPrice.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="font-heading font-black text-xl sm:text-2xl text-[#9306CF] dark:text-[#C7A9C9]">
                      por R$ {product.price.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Economize R${" "}
                      {(config.originalPrice - product.price).toFixed(2).replace(".", ",")}
                    </span>
                  </>
                ) : (
                  <span className="font-heading font-black text-xl sm:text-2xl text-[#9306CF] dark:text-[#C7A9C9]">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>

              {/* Descrição Completa */}
              {product.description && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
                  {product.description}
                </p>
              )}

              {/* Caixa de Avisos de Preparo da Cozinha */}
              {config.preparationNotice && (
                <div className="bg-[#9306CF]/5 dark:bg-[#9306CF]/10 border border-[#9306CF]/20 rounded-2xl p-3 flex gap-2.5 items-start mt-3">
                  <Info className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#4C264F] dark:text-[#F9F5F9] leading-relaxed">
                    {config.preparationNotice}
                  </p>
                </div>
              )}
            </div>

            {/* Grupos de Customização & Adicionais */}
            <div className="space-y-6">
              {config.groups.map((group) => {
                const selectedInGroup = selectedOptions[group.id] || [];
                const currentCount = selectedInGroup.length;
                const isSingleChoice = group.max === 1;

                return (
                  <section
                    key={group.id}
                    className="border border-gray-100 dark:border-[#512B54]/30 rounded-2xl p-3.5 sm:p-4 bg-gray-50/50 dark:bg-white/[0.02]"
                  >
                    {/* Cabeçalho do Grupo */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-heading font-bold text-sm sm:text-base text-[#4C264F] dark:text-[#F9F5F9]">
                          {group.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {group.instruction}
                        </p>
                      </div>

                      {/* Badges de Status e Contagem */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {currentCount}/{group.max}
                        </span>

                        {group.required ? (
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              currentCount >= group.min
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/30 animate-pulse"
                            }`}
                          >
                            Obrigatório
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-200/60 dark:bg-zinc-800 text-muted-foreground">
                            Opcional
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lista de Opções */}
                    <div className="space-y-2">
                      {group.options.map((option) => {
                        const isSelected = selectedInGroup.includes(option.id);
                        const isMaxReached =
                          !isSelected && !isSingleChoice && currentCount >= group.max;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            disabled={isMaxReached}
                            onClick={() => handleToggleOption(group, option)}
                            className={`
                              w-full flex items-center justify-between p-3 sm:p-3.5 rounded-xl
                              border transition-all duration-150 text-left gap-3
                              ${
                                isSelected
                                  ? "border-[#9306CF] bg-[#9306CF]/8 dark:bg-[#9306CF]/15 shadow-xs"
                                  : isMaxReached
                                  ? "border-transparent opacity-40 cursor-not-allowed bg-transparent"
                                  : "border-gray-200/70 dark:border-[#512B54]/30 hover:border-[#9306CF]/40 hover:bg-white dark:hover:bg-[#230E26]/60 bg-white/70 dark:bg-[#230E26]/40 cursor-pointer"
                              }
                            `}
                          >
                            {/* Lado Esquerdo: Seletor + Nome */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Ícone Radio / Checkbox */}
                              {isSingleChoice ? (
                                <div
                                  className={`
                                    w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors
                                    ${
                                      isSelected
                                        ? "border-[#9306CF] bg-[#9306CF]"
                                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-900"
                                    }
                                  `}
                                >
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              ) : (
                                <div
                                  className={`
                                    w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors
                                    ${
                                      isSelected
                                        ? "border-[#9306CF] bg-[#9306CF] text-white"
                                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-900"
                                    }
                                  `}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium whitespace-normal leading-snug ${
                                    isSelected
                                      ? "text-[#4C264F] dark:text-[#F9F5F9] font-semibold"
                                      : "text-foreground"
                                  }`}
                                >
                                  {option.name}
                                </p>
                                {option.description && (
                                  <p className="text-xs text-muted-foreground whitespace-normal leading-tight mt-0.5">
                                    {option.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Lado Direito: Preço Adicional */}
                            <div className="shrink-0 text-xs font-semibold ml-2 text-right">
                              {option.price > 0 ? (
                                <span className="font-mono text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9]">
                                  + R$ {option.price.toFixed(2).replace(".", ",")}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  Grátis
                                </span>
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

            {/* Campo de Observações do Pedido */}
            <div className="border border-gray-100 dark:border-[#512B54]/30 rounded-2xl p-3.5 sm:p-4 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="kitchen-notes"
                  className="font-heading font-bold text-xs sm:text-sm text-[#4C264F] dark:text-[#F9F5F9]"
                >
                  Observações do Pedido
                </label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {notes.length}/140
                </span>
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
                  bg-white dark:bg-[#230E26]/60
                  border border-gray-200 dark:border-[#512B54]/40
                  text-foreground placeholder:text-muted-foreground
                  outline-none focus:ring-2 focus:ring-[#9306CF]/30 focus:border-[#9306CF]/60
                  transition-all resize-none
                "
              />
            </div>
          </div>

          {/* ── RODAPÉ FIXO (Sticky Footer): Quantidade & Adicionar ao Carrinho ── */}
          <div className="
            fixed bottom-0 left-0 right-0 p-3.5 sm:p-4
            pb-[calc(1rem+env(safe-area-inset-bottom,0px))]
            bg-white/95 dark:bg-[#1E0E21]/95 backdrop-blur-md
            border-t border-gray-200 dark:border-[#512B54]/40 z-50
            md:relative md:bottom-auto md:p-4 md:z-auto md:pb-4
            shrink-0 flex items-center gap-3
          ">
            {/* Contador de Quantidade */}
            <div className="flex items-center border border-gray-200 dark:border-[#512B54]/50 rounded-full bg-gray-50 dark:bg-[#230E26] p-1 shrink-0 shadow-xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Diminuir quantidade"
                className="
                  w-8 h-8 rounded-full flex items-center justify-center
                  text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-zinc-800
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
                  text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-zinc-800
                  transition-all cursor-pointer
                "
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Botão Adicionar ao Carrinho Reativo */}
            <button
              type="button"
              disabled={!isValid || isOutOfStock}
              onClick={handleAddToCart}
              className={`
                flex-1 h-12 px-4 py-2.5 rounded-full flex items-center justify-between font-semibold text-sm sm:text-base whitespace-nowrap shadow-md hover:brightness-105 transition-all
                ${
                  !isValid || isOutOfStock
                    ? "bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed border border-dashed border-gray-300 dark:border-zinc-700"
                    : "bg-gradient-to-r from-[#9306CF] to-[#940068] text-white active:scale-[0.98] cursor-pointer shadow-[#9306CF]/25"
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
                • R$ {totalPrice.toFixed(2).replace(".", ",")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
