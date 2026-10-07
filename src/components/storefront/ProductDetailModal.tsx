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
import { UrgencyScarcityBanner } from "./UrgencyScarcityBanner";

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ComboUnit {
  key: string;
  unitIndex: number;
  totalInCombo: number;
  product: Product;
  title: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onClose: () => void;
  productKey?: string;
}

class ProductModalErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ProductDetailModal ErrorBoundary caught:", error, errorInfo);
  }
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.productKey !== this.props.productKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/65 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-[#181D2D] p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-lg font-heading font-bold text-foreground mb-2">Ops, algo deu errado!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Houve um problema ao carregar as opções deste produto.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false }); this.props.onClose(); }}
              className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-foreground rounded-xl font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Fechar e Voltar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type RawAddonGroup = AddonGroup & { group?: AddonGroup; addonItems?: AddonItem[] };

function ProductDetailModalContent({
  product,
  isOpen,
  onClose,
}: ProductDetailModalProps) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  const [loadingAddons, setLoadingAddons] = useState(false);
  
  // Para produtos convencionais
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  // Record<groupId, itemId[]>
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});

  // Para combos como bundles inteligentes
  const [comboUnits, setComboUnits] = useState<ComboUnit[]>([]);
  // Record<unitKey, Record<groupId, itemId[]>>
  const [comboSelections, setComboSelections] = useState<Record<string, Record<string, string[]>>>({});
  const [needsCutlery, setNeedsCutlery] = useState<boolean>(true);
  const [cutleryCount, setCutleryCount] = useState<number>(2);

  const initSelections = useCallback((addonGroups: AddonGroup[]) => {
    const initial: Record<string, string[]> = {};
    (addonGroups || []).forEach((group) => {
      const items = group.items || (group as RawAddonGroup).addonItems || [];
      if (group.isRequired && group.minQuantity === 1 && group.maxQuantity === 1) {
        const firstAvail = items.find((i: AddonItem) => i.isAvailable);
        if (firstAvail) {
          initial[group.id] = [firstAvail.id];
          return;
        }
      }
      initial[group.id] = [];
    });
    setSelectedOptions(initial);
  }, []);

  const processComboUnits = useCallback((items: NonNullable<Product["comboItems"]>) => {
    const units: ComboUnit[] = [];
    let globalIdx = 1;
    const total = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
    
    items.forEach((item) => {
      const qty = item.quantity || 1;
      const childProd = item.product || {
        id: item.productId,
        name: "Item do Combo",
        price: 0,
        description: "",
        imageUrl: "",
      };

      for (let i = 0; i < qty; i++) {
        const key = `${item.id || item.productId}_${i}`;
        const title = qty > 1 ? `${childProd.name} #${i + 1}` : childProd.name;
        
        // Normalize addonGroups on child product
        const normalizedGroups = (childProd.addonGroups || []).map((g: RawAddonGroup) => {
          const group = g.group || g;
          return {
            ...group,
            items: group.items || (group as RawAddonGroup).addonItems || []
          };
        });

        units.push({
          key,
          unitIndex: globalIdx,
          totalInCombo: total,
          product: {
            ...childProd,
            addonGroups: normalizedGroups
          },
          title,
        });
        globalIdx++;
      }
    });

    setComboUnits(units);
    setCutleryCount(Math.max(1, total));

    const initialComboSel: Record<string, Record<string, string[]>> = {};
    units.forEach((u) => {
      initialComboSel[u.key] = {};
      (u.product.addonGroups || []).forEach((g: RawAddonGroup) => {
        const items = g.items || g.addonItems || [];
        if (g.isRequired && g.minQuantity === 1 && g.maxQuantity === 1) {
          const firstAvail = items.find((it: AddonItem) => it.isAvailable);
          if (firstAvail) {
            initialComboSel[u.key][g.id] = [firstAvail.id];
            return;
          }
        }
        initialComboSel[u.key][g.id] = [];
      });
    });
    setComboSelections(initialComboSel);
  }, []);

  // Carrega os dados reais do produto ou combo
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setNotes("");

      if (product.isCombo) {
        if (product.comboItems && product.comboItems.length > 0) {
          processComboUnits(product.comboItems);
        } else {
          setLoadingAddons(true);
          productService
            .getProductById(product.id)
            .then((fullProduct) => {
              if (fullProduct.comboItems && fullProduct.comboItems.length > 0) {
                processComboUnits(fullProduct.comboItems);
              } else {
                setComboUnits([]);
              }
            })
            .catch((err) => {
              console.warn("Aviso ao carregar itens do combo:", err);
              setComboUnits([]);
            })
            .finally(() => {
              setLoadingAddons(false);
            });
        }
      } else {
        const normalizeGroups = (rawGroups: RawAddonGroup[]): AddonGroup[] => {
          return (rawGroups || []).map((g) => {
            const group = g.group || g;
            return {
              ...group,
              items: group.items || (group as RawAddonGroup).addonItems || []
            };
          });
        };

        if (product.addonGroups && product.addonGroups.length > 0) {
          const normGroups = normalizeGroups(product.addonGroups);
          setGroups(normGroups);
          initSelections(normGroups);
        } else {
          setLoadingAddons(true);
          productService
            .getProductById(product.id)
            .then((fullProduct) => {
              const loadedGroups = normalizeGroups(fullProduct.addonGroups || []);
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
      }
    } else {
      setGroups([]);
      setSelectedOptions({});
      setComboUnits([]);
      setComboSelections({});
    }
  }, [isOpen, product, initSelections, processComboUnits]);

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

  // Toggle de Opção para Produto Normal
  const handleToggleOption = (group: AddonGroup, item: AddonItem) => {
    if (!item.isAvailable) return;

    const current = selectedOptions[group.id] || [];
    const isSingle = group.maxQuantity === 1;

    if (isSingle) {
      if (current.includes(item.id)) {
        if (group.isRequired && group.minQuantity >= 1) return;
        setSelectedOptions((prev) => ({ ...prev, [group.id]: [] }));
      } else {
        setSelectedOptions((prev) => ({ ...prev, [group.id]: [item.id] }));
      }
      return;
    }

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

  // Toggle de Opção para Unidade do Combo
  const handleToggleComboOption = (unitKey: string, group: AddonGroup, item: AddonItem) => {
    if (!item.isAvailable) return;

    const unitSel = comboSelections[unitKey] || {};
    const current = unitSel[group.id] || [];
    const isSingle = group.maxQuantity === 1;

    let updatedGroup: string[];
    if (isSingle) {
      if (current.includes(item.id)) {
        if (group.isRequired && group.minQuantity >= 1) return;
        updatedGroup = [];
      } else {
        updatedGroup = [item.id];
      }
    } else {
      if (current.includes(item.id)) {
        updatedGroup = current.filter((id) => id !== item.id);
      } else {
        if (current.length < group.maxQuantity) {
          updatedGroup = [...current, item.id];
        } else {
          return;
        }
      }
    }

    setComboSelections((prev) => ({
      ...prev,
      [unitKey]: {
        ...(prev[unitKey] || {}),
        [group.id]: updatedGroup,
      },
    }));
  };

  // Cálculo de Preço Reativo e Snapshot de Adicionais
  const pricing = calculateProductPrice(product);
  const basePrice = pricing.currentPrice;
  const baseOriginalPrice = pricing.originalPrice;
  let extrasTotal = 0;
  const flatSelectedOptionsList: SelectedOption[] = [];

  if (product.isCombo) {
    comboUnits.forEach((unit) => {
      const unitGroups = unit.product.addonGroups || [];
      unitGroups.forEach((group) => {
        const selectedIds = comboSelections[unit.key]?.[group.id] || [];
        const freeQuota = group.freeQuantity || 0;

        selectedIds.forEach((id, index) => {
          const item = group.items.find((i) => i.id === id);
          if (item) {
            const itemPrice = parseSafeNumber(item.price);
            const isFree = index < freeQuota || itemPrice === 0;
            const effectivePrice = isFree ? 0 : itemPrice;
            extrasTotal += effectivePrice;

            flatSelectedOptionsList.push({
              id: item.id,
              groupName: `${unit.title} • ${group.name}`,
              name: `${item.name} (${unit.title})`,
              price: effectivePrice,
              quantity: 1,
            });
          }
        });
      });
    });

    if (needsCutlery) {
      flatSelectedOptionsList.push({
        id: "combo-cutlery",
        groupName: "Utensílios",
        name: `Talheres descartáveis (${cutleryCount} un.)`,
        price: 0,
        quantity: 1,
      });
    }
  } else {
    groups.forEach((group) => {
      const selectedIds = selectedOptions[group.id] || [];
      const freeQuota = group.freeQuantity || 0;

      selectedIds.forEach((id, index) => {
        const item = group.items.find((i) => i.id === id);
        if (item) {
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
  }

  const unitPrice = basePrice + extrasTotal;
  const totalPrice = unitPrice * quantity;
  const isPromo = pricing.isPromotional;
  const originalUnitPrice = isPromo && baseOriginalPrice ? baseOriginalPrice + extrasTotal : undefined;

  // Validação de grupos obrigatórios
  let isValid = true;
  if (product.isCombo) {
    for (const unit of comboUnits) {
      for (const group of unit.product.addonGroups || []) {
        const count = (comboSelections[unit.key]?.[group.id] || []).length;
        const minRequired = group.isRequired ? Math.max(1, group.minQuantity) : group.minQuantity;
        if (count < minRequired) {
          isValid = false;
          break;
        }
      }
      if (!isValid) break;
    }
  } else {
    const unsatisfied = groups.filter((group) => {
      const count = (selectedOptions[group.id] || []).length;
      const minRequired = group.isRequired ? Math.max(1, group.minQuantity) : group.minQuantity;
      return count < minRequired;
    });
    isValid = unsatisfied.length === 0;
  }

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

        {/* ── COLUNA DA ESQUERDA: FOTO, RENDIMENTO & BADGES ── */}
        <div className="md:w-5/12 shrink-0 bg-gray-50 dark:bg-zinc-900/50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-200 dark:border-zinc-800 relative">
          <div className="relative aspect-4/3 md:aspect-square w-full bg-zinc-100 dark:bg-zinc-800/80 overflow-hidden flex items-center justify-center">
            {product.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Utensils className="w-12 h-12 stroke-[1.5] text-muted-foreground/40" />
                <span className="text-xs font-medium">Sem foto</span>
              </div>
            )}

            {/* Badges Flutuantes sobre a Imagem */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
              {product.category && (
                <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                  {product.category}
                </span>
              )}
              {product.cardBadge && (
                <span
                  style={{
                    backgroundColor: product.cardBadge.bgColor,
                    color: product.cardBadge.textColor,
                  }}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  {product.cardBadge.icon && <span>{product.cardBadge.icon}</span>}
                  <span>{product.cardBadge.text}</span>
                </span>
              )}
            </div>

            {/* Rendimento Flutuante */}
            {product.servesText && (
              <div className="absolute bottom-3 left-3 bg-black/65 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>{product.servesText}</span>
              </div>
            )}
          </div>

          {/* Destaque de Garantia / Benefício PopClub */}
          <div className="hidden md:flex flex-col gap-2 p-5 bg-white/60 dark:bg-zinc-900/40 border-t border-gray-200/60 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Garantia de Qualidade e Sabor PopClub</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span>Preparo imediato com ingredientes frescos</span>
            </div>
          </div>
        </div>

        {/* ── COLUNA DA DIREITA: DETALHES, ADICIONAIS & COMBOS ── */}
        <div className="md:w-7/12 flex flex-col justify-between flex-1 min-h-0 bg-white dark:bg-[#181D2D]">
          {/* Área com Scroll dos Complementos */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 pb-32 md:pb-6">
            {/* Título & Preço */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
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

            {/* Banner Fluido de Urgência & Escassez */}
            <UrgencyScarcityBanner product={product} />

            {/* ── MODO 1: MONTAGEM INTELIGENTE DE COMBOS ── */}
            {product.isCombo ? (
              <div className="space-y-6">
                <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Personalize Cada Item do Combo ({comboUnits.length} itens)
                    </span>
                  </div>
                  {product.servesText && (
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {product.servesText}
                    </span>
                  )}
                </div>

                {loadingAddons ? (
                  <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-xs">Carregando itens do combo...</span>
                  </div>
                ) : comboUnits.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-muted-foreground">
                    Este combo não possui itens configurados.
                  </div>
                ) : (
                  comboUnits.map((unit, unitIdx) => {
                    const unitGroups = unit.product.addonGroups || [];

                    return (
                      <div
                        key={unit.key}
                        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30 p-4 space-y-4"
                      >
                        {/* Header da Unidade */}
                        <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                          <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-heading font-black text-sm shrink-0 shadow-xs">
                            {unitIdx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                              {unit.title}
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Escolha os complementos específicos para este item
                            </p>
                          </div>
                        </div>

                        {/* Grupos de Complementos da Unidade */}
                        {unitGroups.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            Sem complementos personalizáveis para este item.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {unitGroups.map((group) => {
                              const selectedInGroup = comboSelections[unit.key]?.[group.id] || [];
                              const currentCount = selectedInGroup.length;
                              const isSingleChoice = group.maxQuantity === 1;
                              const minReq = group.isRequired ? Math.max(1, group.minQuantity) : group.minQuantity;
                              const isSatisfied = currentCount >= minReq;
                              const freeQuota = group.freeQuantity || 0;

                              return (
                                <section
                                  key={group.id}
                                  className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-3 sm:p-3.5 bg-white dark:bg-zinc-800/40 space-y-2.5 shadow-2xs"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className="font-heading font-bold text-xs sm:text-sm text-foreground">
                                        {group.name}
                                      </h4>
                                      {minReq >= 1 ? (
                                        <span
                                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                                            isSatisfied
                                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
                                          }`}
                                        >
                                          {isSatisfied ? "Obrigatório" : `Escolha ${minReq}`}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-zinc-200 dark:border-zinc-700/60 shrink-0">
                                          Opcional
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                        {currentCount} de {group.maxQuantity}
                                      </span>
                                      {freeQuota > 0 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                          Até {freeQuota} incluso{freeQuota === 1 ? "" : "s"}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    {group.items.map((item) => {
                                      const isSelected = selectedInGroup.includes(item.id);
                                      const isMaxReached =
                                        !isSelected && !isSingleChoice && currentCount >= group.maxQuantity;
                                      const isPaused = !item.isAvailable;
                                      const selectedIndex = selectedInGroup.indexOf(item.id);
                                      const itemPrice = parseSafeNumber(item.price);

                                      let priceDisplay = "Incluso";
                                      let priceColor = "text-emerald-600 dark:text-emerald-400 font-bold";

                                      if (itemPrice > 0) {
                                        if (isSelected && selectedIndex < freeQuota) {
                                          priceDisplay = "Incluso";
                                        } else if (!isSelected && currentCount < freeQuota) {
                                          priceDisplay = "Incluso";
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
                                          onClick={() => handleToggleComboOption(unit.key, group, item)}
                                          className={`
                                            w-full flex items-center justify-between p-2 rounded-xl
                                            border transition-all text-left gap-2.5
                                            ${
                                              isPaused
                                                ? "border-dashed border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed"
                                                : isSelected
                                                ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-2xs"
                                                : isMaxReached
                                                ? "opacity-40 cursor-not-allowed bg-transparent"
                                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-primary/40 cursor-pointer"
                                            }
                                          `}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div
                                              className={`w-3.5 h-3.5 rounded-${
                                                isSingleChoice ? "full" : "sm"
                                              } border flex items-center justify-center shrink-0 ${
                                                isSelected
                                                  ? "border-primary bg-primary text-white"
                                                  : "border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                                              }`}
                                            >
                                              {isSelected && (
                                                isSingleChoice ? (
                                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                ) : (
                                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                )
                                              )}
                                            </div>
                                            <span
                                              className={`text-xs font-semibold truncate ${
                                                isSelected
                                                  ? "text-primary dark:text-violet-300"
                                                  : "text-zinc-900 dark:text-zinc-100"
                                              }`}
                                            >
                                              {item.name}
                                            </span>
                                          </div>
                                          <span className={`text-[11px] shrink-0 ${priceColor}`}>
                                            {isPaused ? "Esgotado" : priceDisplay}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </section>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Seletor Consolidado de Talheres para o Combo */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">
                        Talheres e Guardanapos Descartáveis
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Grátis
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                      Deseja que enviemos talheres descartáveis para este combo?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNeedsCutlery(false)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                          !needsCutlery
                            ? "bg-zinc-800 text-white border-zinc-800 dark:bg-white dark:text-black"
                            : "bg-white dark:bg-zinc-800 text-muted-foreground border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        Não
                      </button>
                      <button
                        type="button"
                        onClick={() => setNeedsCutlery(true)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                          needsCutlery
                            ? "bg-primary text-white border-primary"
                            : "bg-white dark:bg-zinc-800 text-muted-foreground border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        Sim
                      </button>
                    </div>
                  </div>

                  {needsCutlery && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                      <span className="text-muted-foreground">Quantidade de colheres/guardanapos:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCutleryCount((c) => Math.max(1, c - 1))}
                          className="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="font-bold w-4 text-center">{cutleryCount}</span>
                        <button
                          type="button"
                          onClick={() => setCutleryCount((c) => Math.min(10, c + 1))}
                          className="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── MODO 2: PRODUTO TRADICIONAL COM COMPLEMENTOS ── */
              loadingAddons ? (
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
                        <div className="space-y-1.5">
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

                          {group.description && (
                            <p className="w-full text-xs text-muted-foreground pt-0.5 leading-relaxed">
                              {group.description}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          {group.items.map((item) => {
                            const isSelected = selectedInGroup.includes(item.id);
                            const isMaxReached =
                              !isSelected && !isSingleChoice && currentCount >= group.maxQuantity;
                            const isPaused = !item.isAvailable;
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
                                <div className="flex items-center gap-3 min-w-0 flex-1">
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
              )
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

            {/* Botão Adicionar ao Carrinho */}
            <button
              type="button"
              disabled={!isValid || isOutOfStock}
              onClick={handleAddToCart}
              className={`
                flex-1 h-12 rounded-2xl font-heading font-black text-sm
                flex items-center justify-between px-5
                transition-all duration-200 shadow-md cursor-pointer select-none
                ${
                  !isValid || isOutOfStock
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed shadow-none"
                    : "bg-primary hover:bg-primary/90 text-white shadow-primary/25 active:scale-[0.99]"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                {isOutOfStock
                  ? "Esgotado"
                  : !isValid
                  ? "Selecione as opções obrigatórias"
                  : "Adicionar à Sacola"}
              </span>
              <span className="font-mono text-base font-black">
                {formatCurrency(totalPrice)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailModal(props: ProductDetailModalProps) {
  if (!props.isOpen || !props.product) return null;
  return (
    <ProductModalErrorBoundary onClose={props.onClose} productKey={props.product.id}>
      <ProductDetailModalContent {...props} />
    </ProductModalErrorBoundary>
  );
}
