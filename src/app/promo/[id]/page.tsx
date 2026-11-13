"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Check,
  AlertCircle,
  SlidersHorizontal,
  ArrowRight,
  Clock,
} from "lucide-react";
import { promotionService, Promotion } from "@/services/promotionService";
import { productService, Product, ProductPromotion } from "@/services/productService";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/components/ui/ToastNotification";
import { BrandHomeLink } from "@/components/storefront/BrandHomeLink";
import { ProductDetailModal } from "@/components/storefront/ProductDetailModal";
import { UrgencyScarcityBanner } from "@/components/storefront/UrgencyScarcityBanner";
import { PromotionDomainService } from "@/domain/services/PromotionDomainService";

export default function PromoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addItem, totalItems } = useCart();
  const { showToast } = useToast();

  const [promo, setPromo] = useState<Promotion | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOffer() {
      try {
        setLoading(true);
        setError(null);
        const promoData = await promotionService.getPromotionById(id);
        if (cancelled) return;
        setPromo(promoData);

        if (promoData.productId) {
          const fullProduct = await productService
            .getProductById(promoData.productId)
            .catch(() => null);
          if (!cancelled && fullProduct) {
            setProduct(fullProduct);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Oferta não encontrada.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOffer();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <BrandHomeLink textSizeClass="text-2xl" />
            <div className="h-9 w-28 rounded-full skeleton-light" />
          </div>
        </header>
        <main className="max-w-5xl w-full mx-auto px-4 py-10 space-y-6">
          <div className="h-64 sm:h-72 rounded-3xl skeleton-light" />
          <div className="h-44 rounded-3xl skeleton-light" />
        </main>
      </div>
    );
  }

  if (error || !promo) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <BrandHomeLink textSizeClass="text-2xl" />
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao Cardápio
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full rounded-3xl border border-border/60 bg-card/90 p-8 text-center shadow-lg space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                Oferta não encontrada
              </h1>
              <p className="text-sm text-muted-foreground">
                {error || "Esta promoção pode ter sido encerrada ou removida do cardápio."}
              </p>
            </div>
            <Link
              href="/"
              className="btn-clay inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white"
            >
              Explorar Cardápio Pop Shake
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const basePrice = Number(product?.price ?? promo.productPrice ?? promo.product?.price ?? 0);
  const pricing = PromotionDomainService.calculatePromotionPricing(
    basePrice,
    promo.discountType,
    Number(promo.discountValue || 0)
  );
  const visibility = PromotionDomainService.getPromotionVisibilityStatus({
    isActive: promo.isActive,
    startsAt: promo.startsAt,
    expiresAt: promo.expiresAt,
    scarcityType: promo.scarcityType,
    scarcityUnits: promo.scarcityUnits,
    product: product ? { isAvailable: product.isAvailable } : promo.product,
  });

  const promoAsProductPromotion: ProductPromotion = {
    id: promo.id,
    title: promo.title,
    badge: promo.badge || "PROMO",
    discountType: promo.discountType,
    discountValue: Number(promo.discountValue || 0),
    startsAt: promo.startsAt ?? null,
    expiresAt: promo.expiresAt ?? null,
    isActive: promo.isActive,
    showDuration: promo.showDuration,
    durationDisplay: promo.durationDisplay,
    showScarcity: promo.showScarcity,
    scarcityUnits: promo.scarcityUnits,
    scarcityType: promo.scarcityType,
    scarcityInitial: promo.scarcityInitial,
    scarcitySold: promo.scarcitySold,
    showProgressBar: promo.showProgressBar,
    urgencyType: promo.urgencyType,
    sessionMinutes: promo.sessionMinutes,
  };

  const hydratedProduct: Product | null = product
    ? {
        ...product,
        promotion: visibility.isVisiblePublicly ? promoAsProductPromotion : product.promotion,
        promotions: visibility.isVisiblePublicly
          ? [promoAsProductPromotion]
          : product.promotions,
      }
    : promo.product
      ? {
          id: promo.product.id,
          name: promo.product.name,
          description: promo.product.description || promo.description || "",
          price: basePrice,
          imageUrl: promo.product.imageUrl || promo.bannerImageUrl || "",
          isAvailable: promo.product.isAvailable ?? true,
          isCombo: promo.product.isCombo ?? false,
          addonGroupIds: promo.product.addonGroupIds ?? [],
          promotion: visibility.isVisiblePublicly ? promoAsProductPromotion : null,
          promotions: visibility.isVisiblePublicly ? [promoAsProductPromotion] : [],
        }
      : null;

  const hasCustomization = Boolean(
    hydratedProduct?.isCombo ||
      (hydratedProduct?.addonGroups && hydratedProduct.addonGroups.length > 0) ||
      (hydratedProduct?.addonGroupIds && hydratedProduct.addonGroupIds.length > 0)
  );

  const gradStart = promo.gradientStart || "#9306CF";
  const gradEnd = promo.gradientEnd || "#881BAA";
  const coverImage = promo.bannerImageUrl || hydratedProduct?.imageUrl || promo.productImage || null;
  const productDisplayName = hydratedProduct?.name || promo.productName || promo.title;

  const handlePrimaryAction = () => {
    if (!hydratedProduct || !visibility.isVisiblePublicly) return;

    if (hasCustomization) {
      setModalOpen(true);
      return;
    }

    addItem({
      productId: hydratedProduct.id,
      name: hydratedProduct.name,
      price: pricing.finalPrice,
      originalPrice: pricing.originalPrice,
      quantity: 1,
      imageUrl: hydratedProduct.imageUrl || promo.bannerImageUrl || undefined,
      promotionId: promo.id,
      promotionTitle: promo.title,
      isCombo: hydratedProduct.isCombo,
    });

    setAddedFeedback(true);
    showToast({
      type: "success",
      title: "Adicionado à sacola!",
      message: `${hydratedProduct.name} com preço promocional aplicado.`,
    });
    setTimeout(() => setAddedFeedback(false), 2600);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Navbar moderna */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-foreground hover:bg-muted transition-colors"
              aria-label="Voltar ao cardápio"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <BrandHomeLink textSizeClass="text-2xl" />
          </div>

          <Link
            href="/carrinho"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all shadow-xs"
          >
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span>Sacola</span>
            {totalItems > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 sm:pt-8 space-y-6">
        {/* Alerta caso promoção não esteja ativa no momento */}
        {!visibility.isVisiblePublicly && (
          <div
            role="status"
            className="rounded-2xl border border-amber-300/70 dark:border-amber-800/50 bg-amber-50/90 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Oferta indisponível no momento ({visibility.label})
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  {visibility.reason}
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition-colors shrink-0"
            >
              Ver ofertas ativas
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Hero Banner Card Moderno */}
        <section
          className="relative overflow-hidden rounded-3xl border border-white/15 shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`,
          }}
        >
          {coverImage && (
            <div className="absolute inset-0 z-0 opacity-25">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage}
                alt={promo.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-black/75 via-black/45 to-black/25"
            aria-hidden="true"
          />

          <div className="relative z-10 p-6 sm:p-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge-clay inline-flex items-center gap-1.5 rounded-full bg-white text-brand-acai-base px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  {promo.badge || "PROMOÇÃO"}
                </span>
                {pricing.isPromotional && (
                  <span className="rounded-full bg-emerald-500 text-white px-3 py-1 text-xs font-bold shadow-sm">
                    {pricing.discountPercent}% DE DESCONTO
                  </span>
                )}
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                {promo.title}
              </h1>

              {promo.description && (
                <p className="text-sm sm:text-base text-white/90 max-w-2xl leading-relaxed">
                  {promo.description}
                </p>
              )}
            </div>

            {hydratedProduct?.imageUrl && (
              <div className="hidden md:block w-44 h-44 rounded-3xl overflow-hidden border-2 border-white/25 bg-black/20 shadow-2xl shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hydratedProduct.imageUrl}
                  alt={productDisplayName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </section>

        {/* Urgência e Escassez Unificada */}
        {hydratedProduct && visibility.isVisiblePublicly && (
          <UrgencyScarcityBanner product={hydratedProduct} />
        )}

        {/* Detalhes do Produto Vinculado e Preço De/Por */}
        <section className="rounded-3xl border border-border/60 bg-card/90 backdrop-blur-xs p-6 sm:p-8 shadow-lg grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-center">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            {coverImage && (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-border/50 bg-muted shrink-0 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt={productDisplayName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                {hydratedProduct?.isCombo ? "Combo Especial" : "Item em Oferta"}
              </span>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                {productDisplayName}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {hydratedProduct?.description ||
                  promo.description ||
                  "Delícia preparada na hora com ingredientes selecionados Pop Shake."}
              </p>
              {hydratedProduct?.servesText && (
                <p className="text-xs font-medium text-primary/90">
                  {hydratedProduct.servesText}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/35 p-5 space-y-4">
            <div className="space-y-1">
              {pricing.isPromotional && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Preço normal</span>
                  <span className="line-through">
                    R$ {pricing.originalPrice.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Valor na oferta
                </span>
                <span className="font-heading text-3xl font-black text-primary">
                  R$ {pricing.finalPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>

              {pricing.discountAmount > 0 && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                  Você economiza R$ {pricing.discountAmount.toFixed(2).replace(".", ",")}
                </p>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={!hydratedProduct || !visibility.isVisiblePublicly}
                onClick={handlePrimaryAction}
                className="btn-clay w-full rounded-2xl py-3.5 px-5 text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {addedFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    Adicionado à Sacola!
                  </>
                ) : hasCustomization ? (
                  <>
                    <SlidersHorizontal className="w-4 h-4" />
                    Personalizar e Adicionar
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    Adicionar à Sacola
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="flex-1 rounded-xl border border-border/60 bg-background hover:bg-muted py-2.5 px-3 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  Continuar comprando
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/carrinho")}
                  className="flex-1 rounded-xl border border-primary/30 bg-primary/8 hover:bg-primary/15 py-2.5 px-3 text-xs font-bold text-primary transition-colors cursor-pointer"
                >
                  Ir para Sacola
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {hydratedProduct && (
        <ProductDetailModal
          product={hydratedProduct}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
