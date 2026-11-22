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
  AlertTriangle,
} from "lucide-react";
import { Product, productService } from "../../services/productService";
import { AddonGroup, AddonItem } from "../../services/addonService";
import { SelectedOption } from "../../contexts/CartContext";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../ui/ToastNotification";
import { formatCurrency, parseSafeNumber } from "@/lib/formatters";
import { calculateProductPrice } from "@/lib/pricing";
import { UrgencyScarcityBanner } from "./UrgencyScarcityBanner";
import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";

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
  static getDerivedStateFromError() {
    return { hasError: true };
  }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/65 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-[#181D2D] p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-lg font-heading font-bold text-foreground mb-2">Ops, algo deu errado!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Houve um problema ao carregar as opções deste produto.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onClose();
              }}
              className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-foreground rounded-xl font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
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

function AddonItemThumbnail({
  imageUrl,
  name,
}: {
  imageUrl?: string | null;
  name: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const cleanUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const showImage = Boolean(cleanUrl) && failedUrl !== cleanUrl;

  return (
    <div
      data-testid="addon-item-thumbnail"
      className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-[#0D1017] border border-zinc-800/80 shrink-0 overflow-hidden flex items-center justify-center"
    >
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={cleanUrl}
          src={cleanUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setFailedUrl(cleanUrl)}
        />
      ) : null}
    </div>
  );
}

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

  // Para produtos convencionais: Record<groupId, Record<itemId, number>>
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, number>>>({});

  // Para combos inteligentes: Record<unitKey, Record<groupId, Record<itemId, number>>>
  const [comboUnits, setComboUnits] = useState<ComboUnit[]>([]);
  const [comboSelections, setComboSelections] = useState<Record<string, Record<string, Record<string, number>>>>({});

  const initSelections = useCallback((addonGroups: AddonGroup[]) => {
    const initial: Record<string, Record<string, number>> = {};
    (addonGroups || []).forEach((group) => {
      initial[group.id] = {};
      const items = group.items || (group as RawAddonGroup).addonItems || [];
      if (group.isRequired && group.minQuantity === 1 && group.maxQuantity === 1) {
        const firstAvail = items.find((i: AddonItem) => i.isAvailable);
        if (firstAvail) {
          initial[group.id] = { [firstAvail.id]: 1 };
        }
      }
    });
    setSelectedOptions(initial);
  }, []);

  const normalizeRawGroups = useCallback((rawGroups?: RawAddonGroup[]): AddonGroup[] => {
    const mapped = (rawGroups || [])
      .map((g: RawAddonGroup) => {
        const group = g.group || g;
        return {
          ...group,
          items: group.items || (group as RawAddonGroup).addonItems || [],
        };
      })
      .filter((group) => group.isActive !== false);
    return AddonOrganizationService.sortAddonGroups(mapped);
  }, []);

  const processComboUnits = useCallback(
    (items: NonNullable<Product["comboItems"]>, parentAddonGroups?: RawAddonGroup[]) => {
      const rawUnits: Array<{
        key: string;
        unitIndex: number;
        totalInCombo: number;
        product: Product;
        title: string;
        groups: AddonGroup[];
      }> = [];
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
          const normalizedGroups = normalizeRawGroups(childProd.addonGroups as RawAddonGroup[]);

          rawUnits.push({
            key,
            unitIndex: globalIdx,
            totalInCombo: total,
            product: {
              ...childProd,
              addonGroups: normalizedGroups,
            },
            title,
            groups: normalizedGroups,
          });
          globalIdx++;
        }
      });

      const normalizedParentGroups = normalizeRawGroups(parentAddonGroups);
      const partitioned = AddonOrganizationService.partitionComboGroups({
        comboAddonGroups: normalizedParentGroups,
        comboUnits: rawUnits.map((u) => ({
          key: u.key,
          title: u.title,
          groups: u.groups,
        })),
      });

      const units: ComboUnit[] = rawUnits.map((rawUnit, idx) => ({
        key: rawUnit.key,
        unitIndex: rawUnit.unitIndex,
        totalInCombo: rawUnit.totalInCombo,
        title: rawUnit.title,
        product: {
          ...rawUnit.product,
          addonGroups: partitioned.units[idx]?.groups || [],
        },
      }));

      setComboUnits(units);

      const initialComboSel: Record<string, Record<string, Record<string, number>>> = {};
      units.forEach((u) => {
        initialComboSel[u.key] = {};
        (u.product.addonGroups || []).forEach((g: RawAddonGroup) => {
          initialComboSel[u.key][g.id] = {};
          const groupItems = g.items || g.addonItems || [];
          if (g.isRequired && g.minQuantity === 1 && g.maxQuantity === 1) {
            const firstAvail = groupItems.find((it: AddonItem) => it.isAvailable);
            if (firstAvail) {
              initialComboSel[u.key][g.id] = { [firstAvail.id]: 1 };
            }
          }
        });
      });
      setComboSelections(initialComboSel);

      setGroups(partitioned.comboTrailingGroups);
      initSelections(partitioned.comboTrailingGroups);
    },
    [initSelections, normalizeRawGroups]
  );

  // Carrega os dados reais do produto ou combo
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setNotes("");

      if (product.isCombo) {
        const hasInitialCombo = Boolean(product.comboItems && product.comboItems.length > 0);
        if (hasInitialCombo) {
          processComboUnits(product.comboItems!, product.addonGroups as RawAddonGroup[]);
        } else {
          setLoadingAddons(true);
        }
        productService
          .getProductById(product.id)
          .then((fullProduct) => {
            if (fullProduct.comboItems && fullProduct.comboItems.length > 0) {
              processComboUnits(fullProduct.comboItems, fullProduct.addonGroups as RawAddonGroup[]);
            } else if (!hasInitialCombo) {
              setComboUnits([]);
              const fallbackGroups = normalizeRawGroups(fullProduct.addonGroups as RawAddonGroup[]);
              setGroups(fallbackGroups);
              initSelections(fallbackGroups);
            }
          })
          .catch((err) => {
            if (!hasInitialCombo) {
              console.warn("Aviso ao carregar itens do combo:", err);
              setComboUnits([]);
              setGroups([]);
            }
          })
          .finally(() => {
            setLoadingAddons(false);
          });
      } else {
        const hasInitialGroups = Boolean(product.addonGroups && product.addonGroups.length > 0);
        if (hasInitialGroups) {
          const normGroups = normalizeRawGroups(product.addonGroups as RawAddonGroup[]);
          setGroups(normGroups);
          initSelections(normGroups);
        } else {
          setLoadingAddons(true);
        }
        productService
          .getProductById(product.id)
          .then((fullProduct) => {
            const loadedGroups = normalizeRawGroups(fullProduct.addonGroups as RawAddonGroup[]);
            setGroups(loadedGroups);
            if (!hasInitialGroups) {
              initSelections(loadedGroups);
            }
          })
          .catch((err) => {
            if (!hasInitialGroups) {
              console.warn("Aviso ao carregar complementos reais do produto:", err);
              setGroups([]);
            }
          })
          .finally(() => {
            setLoadingAddons(false);
          });
      }
    } else {
      setGroups([]);
      setSelectedOptions({});
      setComboUnits([]);
      setComboSelections({});
    }
  }, [isOpen, product, initSelections, normalizeRawGroups, processComboUnits]);

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

  // ── HANDLERS DE SELEÇÃO: PRODUTOS CONVENCIONAIS ──
  const handleToggleOption = (group: AddonGroup, item: AddonItem) => {
    if (!item.isAvailable) return;
    const groupSel = selectedOptions[group.id] || {};
    const currentQty = groupSel[item.id] || 0;
    const isSingle = group.maxQuantity === 1;

    if (isSingle) {
      if (currentQty > 0) {
        if (group.isRequired && group.minQuantity >= 1) return;
        setSelectedOptions((prev) => ({ ...prev, [group.id]: {} }));
      } else {
        setSelectedOptions((prev) => ({ ...prev, [group.id]: { [item.id]: 1 } }));
      }
      return;
    }

    // Se o grupo aceita quantidades múltiplas e já tem unidades, clicar no card pode incrementar
    if (group.allowItemQuantity) {
      if (currentQty > 0) {
        // Se já tem selecionado, o usuário usa os botões +/-
        return;
      }
      const totalCount = Object.values(groupSel).reduce((s, q) => s + q, 0);
      if (totalCount < group.maxQuantity) {
        setSelectedOptions((prev) => ({
          ...prev,
          [group.id]: { ...(prev[group.id] || {}), [item.id]: 1 },
        }));
      }
      return;
    }

    // Marcação simples (checkbox)
    if (currentQty > 0) {
      setSelectedOptions((prev) => {
        const copy = { ...(prev[group.id] || {}) };
        delete copy[item.id];
        return { ...prev, [group.id]: copy };
      });
    } else {
      const totalCount = Object.values(groupSel).reduce((s, q) => s + q, 0);
      if (totalCount < group.maxQuantity) {
        setSelectedOptions((prev) => ({
          ...prev,
          [group.id]: { ...(prev[group.id] || {}), [item.id]: 1 },
        }));
      }
    }
  };

  const handleIncrementOption = (group: AddonGroup, item: AddonItem) => {
    if (!item.isAvailable) return;
    const groupSel = selectedOptions[group.id] || {};
    const totalCount = Object.values(groupSel).reduce((s, q) => s + q, 0);
    if (totalCount >= group.maxQuantity) return;

    setSelectedOptions((prev) => ({
      ...prev,
      [group.id]: {
        ...(prev[group.id] || {}),
        [item.id]: (prev[group.id]?.[item.id] || 0) + 1,
      },
    }));
  };

  const handleDecrementOption = (group: AddonGroup, item: AddonItem) => {
    const groupSel = selectedOptions[group.id] || {};
    const currentQty = groupSel[item.id] || 0;
    if (currentQty <= 1) {
      setSelectedOptions((prev) => {
        const copy = { ...(prev[group.id] || {}) };
        delete copy[item.id];
        return { ...prev, [group.id]: copy };
      });
    } else {
      setSelectedOptions((prev) => ({
        ...prev,
        [group.id]: {
          ...(prev[group.id] || {}),
          [item.id]: currentQty - 1,
        },
      }));
    }
  };

  // ── HANDLERS DE SELEÇÃO: UNIDADES DO COMBO ──
  const handleToggleComboOption = (unitKey: string, group: AddonGroup, item: AddonItem) => {
    if (!item.isAvailable) return;
    const unitSel = comboSelections[unitKey] || {};
    const groupSel = unitSel[group.id] || {};
    const currentQty = groupSel[item.id] || 0;
    const isSingle = group.maxQuantity === 1;

    if (isSingle) {
      let updatedGroup: Record<string, number>;
      if (currentQty > 0) {
        if (group.isRequired && group.minQuantity >= 1) return;
        updatedGroup = {};
      } else {
        updatedGroup = { [item.id]: 1 };
      }
      setComboSelections((prev) => ({
        ...prev,
        [unitKey]: {
          ...(prev[unitKey] || {}),
          [group.id]: updatedGroup,
        },
      }));
      return;
    }

    if (group.allowItemQuantity) {
      if (currentQty > 0) return;
      const totalCount = Object.values(groupSel).reduce((s, q) => s + q, 0);
      if (totalCount < group.maxQuantity) {
        setComboSelections((prev) => ({
          ...prev,
          [unitKey]: {
            ...(prev[unitKey] || {}),
            [group.id]: { ...(prev[unitKey]?.[group.id] || {}), [item.id]: 1 },
          },
        }));
      }
      return;
    }

    // Marcação simples (checkbox)
    if (currentQty > 0) {
      setComboSelections((prev) => {
        const copy = { ...(prev[unitKey]?.[group.id] || {}) };
        delete copy[item.id];
        return {
          ...prev,
          [unitKey]: {
            ...(prev[unitKey] || {}),
            [group.id]: copy,
          },
        };
      });
    } else {
      const totalCount = Object.values(groupSel).reduce((s, q) => s + q, 0);
      if (totalCount < group.maxQuantity) {
        setComboSelections((prev) => ({
          ...prev,
          [unitKey]: {
            ...(prev[unitKey] || {}),
            [group.id]: {
              ...(prev[unitKey]?.[group.id] || {}),
              [item.id]: 1,
            },
          },
        }));
      }
    }
  };

  const handleIncrementComboOption = (unitKey: string, group: AddonGroup, item: AddonItem) => {
    if (!item.isAvailable) return;
    const unitSel = comboSelections[unitKey] || {};
    const groupSel = unitSel[group.id] || {};
    const totalCount = Object.values(groupSel).reduce((s, q) => s + q, 0);
    if (totalCount >= group.maxQuantity) return;

    setComboSelections((prev) => ({
      ...prev,
      [unitKey]: {
        ...(prev[unitKey] || {}),
        [group.id]: {
          ...(prev[unitKey]?.[group.id] || {}),
          [item.id]: (prev[unitKey]?.[group.id]?.[item.id] || 0) + 1,
        },
      },
    }));
  };

  const handleDecrementComboOption = (unitKey: string, group: AddonGroup, item: AddonItem) => {
    const unitSel = comboSelections[unitKey] || {};
    const groupSel = unitSel[group.id] || {};
    const currentQty = groupSel[item.id] || 0;

    if (currentQty <= 1) {
      setComboSelections((prev) => {
        const copy = { ...(prev[unitKey]?.[group.id] || {}) };
        delete copy[item.id];
        return {
          ...prev,
          [unitKey]: {
            ...(prev[unitKey] || {}),
            [group.id]: copy,
          },
        };
      });
    } else {
      setComboSelections((prev) => ({
        ...prev,
        [unitKey]: {
          ...(prev[unitKey] || {}),
          [group.id]: {
            ...(prev[unitKey]?.[group.id] || {}),
            [item.id]: currentQty - 1,
          },
        },
      }));
    }
  };

  // ── CÁLCULO DE PREÇO REATIVO & LISTA SERIALIZADA DE COMPLEMENTOS ──
  const pricing = calculateProductPrice(product);
  const basePrice = pricing.currentPrice;
  const baseOriginalPrice = pricing.originalPrice;
  let extrasTotal = 0;
  const rawSelectedOptionsList: SelectedOption[] = [];

  const appendGroupSelections = (
    group: AddonGroup,
    groupSel: Record<string, number>,
    groupLabel: string
  ) => {
    let freeSlotsLeft = group.freeQuantity || 0;

    Object.entries(groupSel).forEach(([itemId, qty]) => {
      if (qty <= 0) return;
      const item = group.items.find((i) => i.id === itemId);
      if (!item) return;
      const rawPrice = parseSafeNumber(item.price);

      let freeUnits = 0;
      let paidUnits = 0;

      for (let q = 0; q < qty; q++) {
        if (freeSlotsLeft > 0) {
          freeUnits++;
          freeSlotsLeft--;
        } else if (rawPrice === 0) {
          freeUnits++;
        } else {
          paidUnits++;
          extrasTotal += rawPrice;
        }
      }

      if (freeUnits > 0) {
        rawSelectedOptionsList.push({
          id: item.id,
          groupName: groupLabel,
          name: item.name,
          price: 0,
          quantity: freeUnits,
        });
      }

      if (paidUnits > 0) {
        rawSelectedOptionsList.push({
          id: item.id,
          groupName: groupLabel,
          name: item.name,
          price: rawPrice,
          quantity: paidUnits,
        });
      }
    });
  };

  if (product.isCombo) {
    comboUnits.forEach((unit) => {
      const unitGroups = unit.product.addonGroups || [];
      unitGroups.forEach((group) => {
        const groupSel = comboSelections[unit.key]?.[group.id] || {};
        appendGroupSelections(group, groupSel, `${unit.title} • ${group.name}`);
      });
    });

    // Complementos gerais / talheres e descartáveis ao final do combo
    groups.forEach((group) => {
      const groupSel = selectedOptions[group.id] || {};
      appendGroupSelections(group, groupSel, group.name);
    });
  } else {
    groups.forEach((group) => {
      const groupSel = selectedOptions[group.id] || {};
      appendGroupSelections(group, groupSel, group.name);
    });
  }

  const flatSelectedOptionsList: SelectedOption[] = AddonOrganizationService.organizeOrderAddons(
    rawSelectedOptionsList
  ).flatSorted;

  const unitPrice = basePrice + extrasTotal;
  const totalPrice = unitPrice * quantity;
  const isPromo = pricing.isPromotional;
  const originalUnitPrice = isPromo && baseOriginalPrice ? baseOriginalPrice + extrasTotal : undefined;

  // Validação de grupos obrigatórios (tanto nas unidades quanto nos grupos gerais do combo)
  const areStandaloneGroupsValid = groups.every((group) => {
    const groupSel = selectedOptions[group.id] || {};
    const count = Object.values(groupSel).reduce((sum, q) => sum + q, 0);
    const minRequired = group.isRequired ? Math.max(1, group.minQuantity) : group.minQuantity;
    return count >= minRequired;
  });

  let isValid = areStandaloneGroupsValid;
  if (product.isCombo && isValid) {
    for (const unit of comboUnits) {
      for (const group of unit.product.addonGroups || []) {
        const groupSel = comboSelections[unit.key]?.[group.id] || {};
        const count = Object.values(groupSel).reduce((sum, q) => sum + q, 0);
        const minRequired = group.isRequired ? Math.max(1, group.minQuantity) : group.minQuantity;
        if (count < minRequired) {
          isValid = false;
          break;
        }
      }
      if (!isValid) break;
    }
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
    product.effectiveIsAvailable === false ||
    (product.stock !== undefined && product.stock !== null && product.stock <= 0);

  // ── SUB-RENDERERS COMPARTILHADOS ──

  const renderHeaderInfo = () => (
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
      <div className="flex flex-wrap items-baseline gap-2.5 pt-0.5">
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

      {/* Rendimento */}
      {product.servesText && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-foreground text-xs font-semibold">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>{product.servesText}</span>
        </div>
      )}

      {/* Descrição */}
      {product.description && (
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
          {product.description}
        </p>
      )}
      {product.isCombo && (product.unavailableComponents?.length || 0) > 0 && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            Combo temporariamente indisponível devido a:{" "}
            <strong>{product.unavailableComponents!.map((c) => c.name).join(", ")}</strong>.
          </span>
        </div>
      )}
    </div>
  );

  const renderKitchenNotes = (id: string) => (
    <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor={id}
          className="font-heading font-bold text-xs sm:text-sm text-foreground"
        >
          Observações para a Cozinha
        </label>
        <span className="text-[11px] font-mono text-muted-foreground">{notes.length}/140</span>
      </div>
      <textarea
        id={id}
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
  );

  const renderQualityBadges = () => (
    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/50 border border-gray-200/70 dark:border-zinc-800/70">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>Garantia de Qualidade e Sabor PopClub</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-4 h-4 text-primary shrink-0" />
        <span>Preparo imediato com ingredientes frescos</span>
      </div>
    </div>
  );

  const renderFooterBar = () => (
    <div className="flex items-center gap-3 w-full">
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
  );

  const renderAddonsOrCombos = () => {
    if (product.isCombo) {
      return (
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
            <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-zinc-800 text-center text-xs text-muted-foreground">
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
                        const unitSel = comboSelections[unit.key] || {};
                        const groupSel = unitSel[group.id] || {};
                        const currentCount = Object.values(groupSel).reduce((s, q) => s + q, 0);
                        const isSingleChoice = group.maxQuantity === 1;
                        const minReq = group.isRequired ? Math.max(1, group.minQuantity) : group.minQuantity;
                        const isSatisfied = currentCount >= minReq;
                        const freeQuota = group.freeQuantity || 0;
                        const allowsQuantity = Boolean(group.allowItemQuantity && group.maxQuantity > 1);

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
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                  {currentCount} de {group.maxQuantity}
                                </span>
                                {freeQuota > 0 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                    Até {freeQuota} incluso{freeQuota === 1 ? "" : "s"}
                                  </span>
                                )}
                                {allowsQuantity && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    Qtd múltipla (+/-)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              {group.items.map((item) => {
                                const itemQty = groupSel[item.id] || 0;
                                const isSelected = itemQty > 0;
                                const isMaxReached = !isSelected && !isSingleChoice && currentCount >= group.maxQuantity;
                                const isPaused = !item.isAvailable;
                                const itemPrice = parseSafeNumber(item.price);

                                let priceDisplay = "Incluso";
                                let priceColor = "text-emerald-600 dark:text-emerald-400 font-bold";

                                if (itemPrice > 0) {
                                  if (isSelected && currentCount <= freeQuota) {
                                    priceDisplay = "Incluso";
                                  } else if (!isSelected && currentCount < freeQuota) {
                                    priceDisplay = "Incluso";
                                  } else {
                                    const displayPrice = allowsQuantity && itemQty > 1 ? itemPrice * itemQty : itemPrice;
                                    priceDisplay = `+ ${formatCurrency(displayPrice)}`;
                                    priceColor = "text-primary dark:text-violet-400 font-bold font-mono";
                                  }
                                }

                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => handleToggleComboOption(unit.key, group, item)}
                                    className={`
                                      w-full flex items-center justify-between p-2 rounded-xl
                                      border transition-all text-left gap-2.5 select-none
                                      ${
                                        isPaused
                                          ? "border-dashed border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed"
                                          : isSelected
                                          ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-2xs cursor-pointer"
                                          : isMaxReached
                                          ? "opacity-40 cursor-not-allowed bg-transparent"
                                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-primary/40 cursor-pointer"
                                      }
                                    `}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <AddonItemThumbnail imageUrl={item.imageUrl} name={item.name} />
                                      {/* Indicador de Seleção / Radio / Checkbox */}
                                      {!allowsQuantity ? (
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
                                      ) : null}

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

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[11px] ${priceColor}`}>
                                        {isPaused ? "Esgotado" : priceDisplay}
                                      </span>

                                      {/* Controle de Quantidade (+ / -) se permitido */}
                                      {allowsQuantity && !isPaused && (
                                        <div
                                          className="flex items-center gap-1 bg-white dark:bg-zinc-800 rounded-lg border border-border/60 p-0.5 shrink-0"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {itemQty > 0 ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleDecrementComboOption(unit.key, group, item)}
                                                className="w-5 h-5 rounded flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 text-foreground cursor-pointer"
                                                aria-label="Diminuir"
                                              >
                                                <Minus className="w-3 h-3" />
                                              </button>
                                              <span className="w-4 text-center font-bold text-xs">
                                                {itemQty}
                                              </span>
                                              <button
                                                type="button"
                                                disabled={currentCount >= group.maxQuantity}
                                                onClick={() => handleIncrementComboOption(unit.key, group, item)}
                                                className="w-5 h-5 rounded flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 text-foreground disabled:opacity-30 cursor-pointer"
                                                aria-label="Aumentar"
                                              >
                                                <Plus className="w-3 h-3" />
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              disabled={currentCount >= group.maxQuantity}
                                              onClick={() => handleIncrementComboOption(unit.key, group, item)}
                                              className="px-2 py-0.5 rounded text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-30 cursor-pointer flex items-center gap-0.5"
                                            >
                                              <Plus className="w-3 h-3" /> Adicionar
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
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

          {/* Bloco Final do Combo: Talheres / Descartáveis e complementos compartilhados */}
          {!loadingAddons && groups.length > 0 && (
            <div className="rounded-2xl border border-primary/20 dark:border-primary/30 bg-primary/[0.03] dark:bg-primary/5 p-4 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Utensils className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                    Finalização & Descartáveis do Combo
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Configuração única válida para todo o combo
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {groups.map((group) => {
                  const groupSel = selectedOptions[group.id] || {};
                  const currentCount = Object.values(groupSel).reduce((s, q) => s + q, 0);
                  const isSingleChoice = group.maxQuantity === 1;
                  const minReq = group.isRequired ? Math.max(1, group.minQuantity) : group.minQuantity;
                  const isSatisfied = currentCount >= minReq;
                  const freeQuota = group.freeQuantity || 0;
                  const allowsQuantity = Boolean(group.allowItemQuantity && group.maxQuantity > 1);

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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {currentCount} de {group.maxQuantity}
                          </span>
                          {freeQuota > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              Até {freeQuota} incluso{freeQuota === 1 ? "" : "s"}
                            </span>
                          )}
                          {allowsQuantity && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              Qtd múltipla (+/-)
                            </span>
                          )}
                        </div>
                        {group.description && (
                          <p className="w-full text-[11px] text-muted-foreground leading-relaxed">
                            {group.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {group.items.map((item) => {
                          const itemQty = groupSel[item.id] || 0;
                          const isSelected = itemQty > 0;
                          const isMaxReached = !isSelected && !isSingleChoice && currentCount >= group.maxQuantity;
                          const isPaused = !item.isAvailable;
                          const itemPrice = parseSafeNumber(item.price);

                          let priceDisplay = "Incluso";
                          let priceColor = "text-emerald-600 dark:text-emerald-400 font-bold";

                          if (itemPrice > 0) {
                            if (isSelected && currentCount <= freeQuota) {
                              priceDisplay = "Incluso";
                            } else if (!isSelected && currentCount < freeQuota) {
                              priceDisplay = "Incluso";
                            } else {
                              const displayPrice = allowsQuantity && itemQty > 1 ? itemPrice * itemQty : itemPrice;
                              priceDisplay = `+ ${formatCurrency(displayPrice)}`;
                              priceColor = "text-primary dark:text-violet-400 font-bold font-mono";
                            }
                          }

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleToggleOption(group, item)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left gap-2.5 select-none ${
                                isPaused
                                  ? "border-dashed border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed"
                                  : isSelected
                                  ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-2xs cursor-pointer"
                                  : isMaxReached
                                  ? "opacity-40 cursor-not-allowed bg-transparent"
                                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-primary/40 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <AddonItemThumbnail imageUrl={item.imageUrl} name={item.name} />
                                {!allowsQuantity && (
                                  <div
                                    className={`w-3.5 h-3.5 rounded-${isSingleChoice ? "full" : "sm"} border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "border-primary bg-primary text-white"
                                        : "border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                                    }`}
                                  >
                                    {isSelected &&
                                      (isSingleChoice ? (
                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                      ) : (
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      ))}
                                  </div>
                                )}
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

                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[11px] ${priceColor}`}>
                                  {isPaused ? "Esgotado" : priceDisplay}
                                </span>

                                {allowsQuantity && !isPaused && (
                                  <div
                                    className="flex items-center gap-1 bg-white dark:bg-zinc-800 rounded-lg border border-border/60 p-0.5 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {itemQty > 0 ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleDecrementOption(group, item)}
                                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 text-foreground cursor-pointer"
                                          aria-label="Diminuir"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="w-4 text-center font-bold text-xs">{itemQty}</span>
                                        <button
                                          type="button"
                                          disabled={currentCount >= group.maxQuantity}
                                          onClick={() => handleIncrementOption(group, item)}
                                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 text-foreground disabled:opacity-30 cursor-pointer"
                                          aria-label="Aumentar"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={currentCount >= group.maxQuantity}
                                        onClick={() => handleIncrementOption(group, item)}
                                        className="px-2 py-0.5 rounded text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-30 cursor-pointer flex items-center gap-0.5"
                                      >
                                        <Plus className="w-3 h-3" /> Adicionar
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Modo 2: Produto Normal com Grupos de Adicionais
    if (loadingAddons) {
      return (
        <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs">Carregando adicionais disponíveis...</span>
        </div>
      );
    }

    if (groups.length === 0) return null;

    return (
      <div className="space-y-5">
        {groups.map((group) => {
          const groupSel = selectedOptions[group.id] || {};
          const currentCount = Object.values(groupSel).reduce((s, q) => s + q, 0);
          const isSingleChoice = group.maxQuantity === 1;
          const minReq = group.isRequired ? Math.max(1, group.minQuantity) : group.minQuantity;
          const isSatisfied = currentCount >= minReq;
          const freeQuota = group.freeQuantity || 0;
          const allowsQuantity = Boolean(group.allowItemQuantity && group.maxQuantity > 1);

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

                  {allowsQuantity && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      Qtd múltipla (+/-)
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
                  const itemQty = groupSel[item.id] || 0;
                  const isSelected = itemQty > 0;
                  const isMaxReached = !isSelected && !isSingleChoice && currentCount >= group.maxQuantity;
                  const isPaused = !item.isAvailable;
                  const itemPrice = parseSafeNumber(item.price);

                  let priceDisplay = "Incluso";
                  let priceColor = "text-emerald-600 dark:text-emerald-400 font-bold";

                  if (itemPrice > 0) {
                    if (isSelected && currentCount <= freeQuota) {
                      priceDisplay = "Incluso";
                    } else if (!isSelected && currentCount < freeQuota) {
                      priceDisplay = "Incluso";
                    } else {
                      const displayPrice = allowsQuantity && itemQty > 1 ? itemPrice * itemQty : itemPrice;
                      priceDisplay = `+ ${formatCurrency(displayPrice)}`;
                      priceColor = "text-primary dark:text-violet-400 font-bold font-mono";
                    }
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleOption(group, item)}
                      className={`
                        w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl
                        border transition-all text-left gap-3 select-none
                        ${
                          isPaused
                            ? "border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/30 opacity-50 cursor-not-allowed"
                            : isSelected
                            ? "border-primary bg-primary/8 dark:bg-primary/15 shadow-2xs cursor-pointer"
                            : isMaxReached
                            ? "border-transparent opacity-40 cursor-not-allowed bg-transparent"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181D2D] hover:border-primary/40 cursor-pointer shadow-2xs"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <AddonItemThumbnail imageUrl={item.imageUrl} name={item.name} />

                        {!allowsQuantity ? (
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
                        ) : null}

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

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <div className="text-right">
                          {isPaused ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                              Esgotado
                            </span>
                          ) : (
                            <span className={`text-xs ${priceColor}`}>{priceDisplay}</span>
                          )}
                        </div>

                        {/* Controles de Quantidade (+ / -) para o item */}
                        {allowsQuantity && !isPaused && (
                          <div
                            className="flex items-center gap-1 bg-white dark:bg-zinc-800 rounded-xl border border-border/60 p-0.5 shrink-0 shadow-2xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {itemQty > 0 ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDecrementOption(group, item)}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 text-foreground transition-colors cursor-pointer"
                                  aria-label="Diminuir"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-5 text-center font-black text-xs font-mono">
                                  {itemQty}
                                </span>
                                <button
                                  type="button"
                                  disabled={currentCount >= group.maxQuantity}
                                  onClick={() => handleIncrementOption(group, item)}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 text-foreground disabled:opacity-30 transition-colors cursor-pointer"
                                  aria-label="Aumentar"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={currentCount >= group.maxQuantity}
                                onClick={() => handleIncrementOption(group, item)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-30 cursor-pointer flex items-center gap-1 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" /> Adicionar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

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
          relative w-full md:max-w-4xl lg:max-w-5xl h-[92dvh] max-h-[92dvh] md:h-[86vh] md:max-h-[86vh]
          bg-white dark:bg-[#181D2D] text-foreground
          border-t md:border border-gray-200 dark:border-zinc-800
          rounded-t-[28px] md:rounded-3xl shadow-2xl
          flex flex-col overflow-hidden
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── MOBILE LAYOUT (< md): PRESERVAÇÃO ESTRITA DE COLUNA ÚNICA ── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:hidden flex-1 min-h-0 overflow-y-auto">
          {/* 1. Imagem no topo */}
          <div className="relative aspect-4/3 w-full bg-zinc-100 dark:bg-zinc-800/80 overflow-hidden shrink-0 flex items-center justify-center">
            {product.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
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
          </div>

          {/* 2. Título, badges, preço, rendimento, descrição */}
          <div className="p-4 space-y-3">
            {renderHeaderInfo()}
            <UrgencyScarcityBanner product={product} />
          </div>

          {/* 3. Grupos de complementos em sequência */}
          <div className="px-4 space-y-4">
            {renderAddonsOrCombos()}
          </div>

          {/* 4. Campo de "Observações para a Cozinha" */}
          <div className="p-4 pb-28">
            {renderKitchenNotes("kitchen-notes-mobile")}
          </div>
        </div>

        {/* Barra Inferior Fixa no Mobile */}
        <div className="
          md:hidden fixed bottom-0 left-0 right-0 p-3.5
          pb-[calc(1rem+env(safe-area-inset-bottom,0px))]
          bg-white/95 dark:bg-[#181D2D]/95 backdrop-blur-md
          border-t border-gray-200 dark:border-zinc-800 z-50
        ">
          {renderFooterBar()}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── DESKTOP LAYOUT (md+): SPLIT EM DUAS COLUNAS ─────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="hidden md:flex flex-row flex-1 min-h-0 overflow-hidden">
          {/* ── COLUNA DA ESQUERDA (Informações, Apresentação, Observações, Selos) ── */}
          <div className="w-1/2 shrink-0 border-r border-gray-200 dark:border-zinc-800 flex flex-col justify-between overflow-y-auto p-6 space-y-5 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="space-y-4">
              {/* Imagem do produto com proporção equilibrada */}
              <div className="relative aspect-16/10 w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 shadow-xs border border-border/40 flex items-center justify-center">
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
              </div>

              {/* Informações de Título, Preço, Rendimento, Descrição */}
              {renderHeaderInfo()}

              {/* Banner de Urgência & Escassez */}
              <UrgencyScarcityBanner product={product} />
            </div>

            {/* Base da Coluna Esquerda: Observações da Cozinha & Selos de Qualidade */}
            <div className="space-y-4 pt-3 border-t border-gray-200/60 dark:border-zinc-800/60">
              {renderKitchenNotes("kitchen-notes-desktop")}
              {renderQualityBadges()}
            </div>
          </div>

          {/* ── COLUNA DA DIREITA (Área Exclusiva de Complementos & Ação) ── */}
          <div className="w-1/2 flex flex-col justify-between flex-1 min-h-0 bg-white dark:bg-[#181D2D]">
            {/* Rolagem Vertical Independente */}
            <div className="overflow-y-auto p-6 space-y-5 flex-1 min-h-0">
              <div className="pb-2 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {product.isCombo ? "Personalização do Combo" : "Complementos e Opcionais"}
                </h3>
              </div>

              {renderAddonsOrCombos()}
            </div>

            {/* Rodapé com Contador e Botão de Adicionar à Sacola */}
            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#181D2D] shrink-0">
              {renderFooterBar()}
            </div>
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
