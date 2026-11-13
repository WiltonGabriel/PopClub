"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowRight,
  Clock,
  Timer,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { promotionService, Promotion } from "../../services/promotionService";
import { useAuth } from "../../hooks/useAuth";
import { useEditMode } from "../../contexts/EditModeContext";
import { PromotionFormDialog } from "../admin/PromotionFormDialog";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../ui/ToastNotification";
import {
  PromotionDomainService,
  PromotionVisibilityStatus,
} from "@/domain/services/PromotionDomainService";

function getVisibilityBadgeStyle(status: PromotionVisibilityStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-500 text-white border-emerald-300/60";
    case "paused":
      return "bg-amber-500 text-zinc-950 border-amber-300/60";
    case "expired":
    case "sold_out":
    case "product_unavailable":
      return "bg-rose-600 text-white border-rose-300/60";
    case "scheduled":
      return "bg-sky-500 text-white border-sky-300/60";
    default:
      return "bg-zinc-700 text-white border-white/20";
  }
}

function getPromoCountdownBadge(promo: Promotion, nowMs: number) {
  if (!promo.showDuration || !promo.expiresAt) {
    if (promo.showScarcity && promo.scarcityUnits !== null && promo.scarcityUnits !== undefined) {
      return {
        label: `Restam ${promo.scarcityUnits} unid.`,
        Icon: Sparkles,
      };
    }
    return null;
  }

  const diffMs = new Date(promo.expiresAt).getTime() - nowMs;
  if (diffMs <= 0) return null;

  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (
    promo.urgencyType === "session" ||
    promo.urgencyType === "day" ||
    promo.durationDisplay?.includes("Cronômetro Regressivo")
  ) {
    const label =
      diffDays > 0
        ? `${diffDays}d ${diffHours % 24}h restantes`
        : diffHours > 0
          ? `${diffHours}h restantes`
          : `${diffMinutes}min restantes`;
    return { label, Icon: Timer };
  }

  if (promo.urgencyType === "date" || promo.durationDisplay?.includes("Data e Hora Limite Claras")) {
    return {
      label: `Até ${new Date(promo.expiresAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })}`,
      Icon: Clock,
    };
  }

  if (promo.durationDisplay?.includes("Contador de Estoque Limitado")) {
    return { label: "Últimas unidades", Icon: Sparkles };
  }

  return { label: "Oferta Limitada", Icon: Clock };
}

export function PromoBanner() {
  const { isAdmin } = useAuth();
  const { isEditMode } = useEditMode();
  const { showToast } = useToast();
  const canEdit = isAdmin && isEditMode;

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [promoToEdit, setPromoToEdit] = useState<Promotion | null>(null);
  const [promoToDelete, setPromoToDelete] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const isOverflowing = scrollWidth > clientWidth + 2;
    setHasOverflow(isOverflowing);
    setCanScrollLeft(isOverflowing && scrollLeft > 2);
    setCanScrollRight(isOverflowing && scrollLeft + clientWidth < scrollWidth - 2);

    if (promotions.length > 1) {
      const ratio = scrollWidth > clientWidth ? scrollLeft / (scrollWidth - clientWidth) : 0;
      setActiveSlideIndex(Math.min(promotions.length - 1, Math.round(ratio * (promotions.length - 1))));
    } else {
      setActiveSlideIndex(0);
    }
  }, [promotions.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    const handleScroll = () => checkScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => checkScroll());
      resizeObserver.observe(el);
    }

    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, promotions]);

  const handleScrollBy = (offset: number) => {
    if (!scrollRef.current) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    scrollRef.current.scrollBy({ left: offset, behavior: prefersReduced ? "auto" : "smooth" });
  };

  const scrollToSlide = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const slide = el.children[index] as HTMLElement | undefined;
    if (!slide) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: Math.max(0, slide.offsetLeft - 8),
      behavior: prefersReduced ? "auto" : "smooth",
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  const fetchPromos = useCallback(async () => {
    try {
      setLoading(true);
      const data = canEdit
        ? await promotionService.getAllPromotions()
        : await promotionService.getActivePromotions();
      setPromotions(data);
    } catch (err) {
      console.error("Erro ao buscar promoções dinâmicas:", err);
    } finally {
      setLoading(false);
    }
  }, [canEdit]);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const handleToggleVisibility = async (
    e: React.MouseEvent,
    promo: Promotion,
    status: PromotionVisibilityStatus
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (status === "expired" || status === "sold_out") {
      setPromoToEdit(promo);
      setDialogOpen(true);
      showToast({
        type: "info",
        title: "Renovar vigência da oferta",
        message: "Ajuste a data limite ou o estoque do lote antes de republicar na vitrine.",
      });
      return;
    }

    setTogglingId(promo.id);
    try {
      await promotionService.updatePromotion(promo.id, { isActive: !promo.isActive });
      showToast({
        type: "success",
        title: promo.isActive ? "Banner pausado na vitrine" : "Banner publicado para clientes",
      });
      await fetchPromos();
    } catch (err) {
      showToast({
        type: "error",
        title: "Erro ao alterar visibilidade",
        message: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleEdit = (e: React.MouseEvent, promo: Promotion) => {
    e.preventDefault();
    e.stopPropagation();
    setPromoToEdit(promo);
    setDialogOpen(true);
  };

  const handleRequestDelete = (e: React.MouseEvent, promo: Promotion) => {
    e.preventDefault();
    e.stopPropagation();
    setPromoToDelete(promo);
  };

  const handleConfirmDelete = async () => {
    if (!promoToDelete) return;
    setDeleting(true);
    try {
      await promotionService.deletePromotion(promoToDelete.id);
      showToast({ type: "success", title: "Banner promocional excluído" });
      setPromoToDelete(null);
      await fetchPromos();
    } catch (err) {
      showToast({
        type: "error",
        title: "Erro ao excluir promoção",
        message: err instanceof Error ? err.message : "Não foi possível excluir.",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading && promotions.length === 0) {
    return (
      <section className="mb-6" aria-label="Carregando promoções">
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {[1, 2].map((n) => (
            <div key={n} className="shrink-0 w-[85%] md:w-[55%] h-44 rounded-3xl skeleton-light" />
          ))}
        </div>
      </section>
    );
  }

  if (!loading && promotions.length === 0 && !canEdit) {
    return null;
  }

  const visibilityList = promotions.map((promo) => ({
    promo,
    visibility: PromotionDomainService.getPromotionVisibilityStatus(promo, new Date(nowMs)),
  }));
  const activePublicCount = visibilityList.filter((item) => item.visibility.isVisiblePublicly).length;
  const hiddenCount = visibilityList.length - activePublicCount;

  return (
    <>
      <section
        className="mb-6 relative"
        aria-roledescription="carousel"
        aria-label="Promoções em destaque"
      >
        {canEdit && (
          <div className="mb-3 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Eye className="w-4 h-4 text-primary shrink-0" />
              <span>
                <strong>Modo Edição de Banners:</strong> {activePublicCount} visível(is) para clientes
                {hiddenCount > 0
                  ? ` • ${hiddenCount} oculto(s) fora do modo edição (pausado ou expirado)`
                  : ""}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Clique no olho para publicar/pausar na vitrine pública
            </span>
          </div>
        )}

        {/* Left fade mask */}
        {hasOverflow && canScrollLeft && (
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-2 w-8 md:w-16 bg-gradient-to-r from-background via-background/80 to-transparent z-10 transition-opacity duration-200"
            aria-hidden="true"
          />
        )}

        {/* Right fade mask */}
        {hasOverflow && canScrollRight && (
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 md:w-16 bg-gradient-to-l from-background via-background/80 to-transparent z-10 transition-opacity duration-200"
            aria-hidden="true"
          />
        )}

        {/* Left Chevron (Desktop only) */}
        {hasOverflow && canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScrollBy(-360)}
            aria-label="Rolar promoções para a esquerda"
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-9 h-9 rounded-full bg-background/90 dark:bg-card/90 border border-border/60 shadow-lg text-foreground hover:text-primary transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            style={{ touchAction: "manipulation" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Chevron (Desktop only) */}
        {hasOverflow && canScrollRight && (
          <button
            type="button"
            onClick={() => handleScrollBy(360)}
            aria-label="Rolar promoções para a direita"
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-9 h-9 rounded-full bg-background/90 dark:bg-card/90 border border-border/60 shadow-lg text-foreground hover:text-primary transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            style={{ touchAction: "manipulation" }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-2 no-scrollbar scroll-smooth"
        >
          {visibilityList.map(({ promo, visibility }, idx) => {
            const gradStart = promo.gradientStart || "#9306CF";
            const gradEnd = promo.gradientEnd || "#881BAA";
            const coverImage =
              promo.bannerImageUrl || promo.productImage || promo.product?.imageUrl || null;
            const basePrice = Number(promo.productPrice ?? promo.product?.price ?? 0);
            const pricing = PromotionDomainService.calculatePromotionPricing(
              basePrice,
              promo.discountType,
              Number(promo.discountValue || 0)
            );

            const discountLabel =
              promo.discountType === "percentage"
                ? `${promo.discountValue}% OFF`
                : pricing.isPromotional
                  ? `POR R$ ${pricing.finalPrice.toFixed(2).replace(".", ",")}`
                  : `POR R$ ${Number(promo.discountValue).toFixed(2).replace(".", ",")}`;

            const countdown = getPromoCountdownBadge(promo, nowMs);

            return (
              <article
                key={promo.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} de ${visibilityList.length}: ${promo.title}`}
                className={`group relative snap-center shrink-0 w-[86%] md:w-[56%] h-44 rounded-3xl overflow-hidden border border-white/15 shadow-lg hover:shadow-xl transition-all duration-300 ${
                  !visibility.isVisiblePublicly && canEdit ? "opacity-80 ring-2 ring-amber-400/70" : ""
                }`}
                style={{
                  background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`,
                }}
              >
                {/* Cover image overlay (banner or linked product fallback) */}
                {coverImage && (
                  <div className="absolute inset-0 z-0 opacity-25 group-hover:opacity-35 transition-opacity duration-500">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImage}
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Scrim for guaranteed legibility */}
                <div
                  className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10"
                  aria-hidden="true"
                />

                {/* Decorative blobs */}
                <div
                  className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-500 pointer-events-none"
                  aria-hidden="true"
                />
                <div
                  className="absolute -right-2 top-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none"
                  aria-hidden="true"
                />

                {/* Admin top overlay controls (strictly sibling to Link, never nested) */}
                {canEdit && (
                  <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
                    <span
                      title={visibility.reason}
                      className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${getVisibilityBadgeStyle(
                        visibility.status
                      )}`}
                    >
                      {visibility.isVisiblePublicly ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                      {visibility.label}
                    </span>

                    <div className="pointer-events-auto flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm p-1 rounded-xl shadow-md border border-border/30">
                      <button
                        type="button"
                        disabled={togglingId === promo.id}
                        onClick={(e) => handleToggleVisibility(e, promo, visibility.status)}
                        title={
                          visibility.status === "expired" || visibility.status === "sold_out"
                            ? "Renovar vigência/lote"
                            : promo.isActive
                              ? "Pausar na vitrine pública"
                              : "Publicar na vitrine pública"
                        }
                        aria-label={
                          promo.isActive ? `Pausar ${promo.title}` : `Publicar ${promo.title}`
                        }
                        className="p-1.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                      >
                        {promo.isActive ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleEdit(e, promo)}
                        title="Editar Promoção"
                        aria-label={`Editar ${promo.title}`}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleRequestDelete(e, promo)}
                        title="Excluir Promoção"
                        aria-label={`Excluir ${promo.title}`}
                        className="p-1.5 text-destructive hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Main stretched Link covering card */}
                <Link
                  href={`/promo/${promo.id}`}
                  className="relative z-10 flex h-full flex-col justify-end p-4 sm:p-5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white rounded-3xl"
                >
                  <span className="badge-clay self-start bg-white text-brand-acai-base text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-widest mb-2 shadow-xs">
                    {promo.badge || "PROMO"}
                  </span>

                  <h3 className="font-heading text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-tight truncate drop-shadow-xs">
                    {promo.title}
                  </h3>

                  {promo.description && (
                    <p className="text-xs text-white/85 font-sans line-clamp-1 max-w-[82%] mt-0.5">
                      {promo.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <span className="badge-clay bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                      {discountLabel}
                    </span>

                    {pricing.isPromotional && basePrice > 0 && (
                      <span className="text-[11px] text-white/75 line-through font-medium">
                        R$ {basePrice.toFixed(2).replace(".", ",")}
                      </span>
                    )}

                    {countdown && (
                      <span className="flex items-center gap-1 bg-rose-500/85 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                        <countdown.Icon className="w-3 h-3" />
                        {countdown.label}
                      </span>
                    )}

                    <span className="ml-auto text-[11px] font-bold text-white/95 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform duration-200">
                      Aproveitar oferta <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}

          {/* Admin: add new promo */}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setPromoToEdit(null);
                setDialogOpen(true);
              }}
              className="snap-center shrink-0 w-[55%] md:w-[28%] h-44 rounded-3xl border-2 border-dashed border-primary/35 bg-primary/5 hover:bg-primary/10 hover:border-primary flex flex-col items-center justify-center p-6 transition-all duration-200 text-primary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-semibold text-xs uppercase tracking-widest text-center">
                Nova Promoção
              </span>
            </button>
          )}
        </div>

        {/* Dots pagination when multiple slides */}
        {visibilityList.length > 1 && (
          <div className="mt-2 flex items-center justify-center gap-1.5" aria-label="Indicadores de banners">
            {visibilityList.map(({ promo }, index) => (
              <button
                key={promo.id}
                type="button"
                onClick={() => scrollToSlide(index)}
                aria-label={`Ir para banner ${index + 1}: ${promo.title}`}
                aria-current={activeSlideIndex === index ? "true" : undefined}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeSlideIndex === index
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        )}
      </section>

      <PromotionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchPromos}
        promoToEdit={promoToEdit}
      />

      <ConfirmDialog
        open={!!promoToDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setPromoToDelete(null);
        }}
        title="Excluir banner promocional"
        description={`Tem certeza que deseja excluir "${promoToDelete?.title || "esta promoção"}"? Esta ação remove a oferta da vitrine.`}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
