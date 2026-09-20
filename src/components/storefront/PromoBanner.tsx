"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, ArrowRight } from "lucide-react";
import { promotionService, Promotion } from "../../services/promotionService";
import { useAuth } from "../../hooks/useAuth";
import { useEditMode } from "../../contexts/EditModeContext";
import { PromotionFormDialog } from "../admin/PromotionFormDialog";

export function PromoBanner() {
  const { isAdmin } = useAuth();
  const { isEditMode } = useEditMode();
  const canEdit = isAdmin && isEditMode;

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [promoToEdit, setPromoToEdit] = useState<Promotion | null>(null);

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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir esta promoção?")) {
      try {
        await promotionService.deletePromotion(id);
        fetchPromos();
      } catch {
        alert("Erro ao excluir promoção.");
      }
    }
  };

  const handleEdit = (e: React.MouseEvent, promo: Promotion) => {
    e.preventDefault();
    e.stopPropagation();
    setPromoToEdit(promo);
    setDialogOpen(true);
  };

  /* ── Loading skeleton ── */
  if (loading && promotions.length === 0) {
    return (
      <section className="mb-6" aria-label="Carregando promoções">
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="shrink-0 w-[85%] md:w-[55%] h-40 rounded-2xl skeleton-light"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!loading && promotions.length === 0 && !canEdit) {
    return null;
  }

  return (
    <>
      <section className="mb-6" aria-label="Promoções em destaque">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 no-scrollbar">
          {promotions.map((promo) => {
            const gradStart = promo.gradientStart || "#9306CF";
            const gradEnd   = promo.gradientEnd   || "#940068";
            const hasBanner = Boolean(promo.bannerImageUrl);

            const discountLabel =
              promo.discountType === "percentage"
                ? `${promo.discountValue}% OFF`
                : `R$ ${promo.discountValue.toFixed(2)} OFF`;

            return (
              <div
                key={promo.id}
                className="
                  group relative snap-center shrink-0
                  w-[85%] md:w-[55%] h-40
                  rounded-2xl overflow-hidden
                  border border-white/10
                  shadow-md hover:shadow-xl
                  transition-all duration-300
                  cursor-pointer
                "
                style={{
                  background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`,
                }}
              >
                {/* Banner image overlay */}
                {hasBanner && (
                  <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-25 transition-opacity">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={promo.bannerImageUrl}
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Decorative blob */}
                <div className="
                  absolute -right-8 -bottom-8
                  w-36 h-36 rounded-full
                  bg-white/10
                  group-hover:scale-110 transition-transform duration-500
                  pointer-events-none
                " />
                <div className="
                  absolute -right-2 top-4
                  w-20 h-20 rounded-full
                  bg-white/5
                  pointer-events-none
                " />

                {/* Clickable content */}
                <Link href={`/promo/${promo.id}`} className="absolute inset-0 z-10 flex flex-col justify-end p-4">
                  {/* Badge */}
                  <span className="
                    badge-clay
                    self-start
                    bg-white text-brand-acai-base
                    text-[10px] font-bold uppercase px-2.5 py-1
                    rounded-full tracking-widest mb-2
                  ">
                    {promo.badge}
                  </span>

                  <h3 className="font-heading text-xl font-black uppercase tracking-tight text-white leading-tight truncate">
                    {promo.title}
                  </h3>

                  <p className="text-xs text-white/80 font-sans line-clamp-1 max-w-[70%] mt-0.5">
                    {promo.description}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="
                      badge-clay
                      bg-white/20 text-white
                      text-xs font-bold px-2.5 py-1 rounded-full
                      backdrop-blur-sm
                    ">
                      {discountLabel}
                    </span>
                    <span className="
                      text-[11px] font-semibold text-white/90
                      flex items-center gap-1
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-200
                    ">
                      Ver combo <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>

                {/* Admin controls */}
                {canEdit && (
                  <div className="absolute top-2 right-2 z-20 flex gap-1 bg-white/95 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-border/20">
                    <button
                      onClick={(e) => handleEdit(e, promo)}
                      title="Editar Promoção"
                      className="p-1.5 text-brand-pop-shake hover:bg-brand-surface-2 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, promo.id)}
                      title="Excluir Promoção"
                      className="p-1.5 text-destructive hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Admin: add new promo */}
          {canEdit && (
            <button
              onClick={() => {
                setPromoToEdit(null);
                setDialogOpen(true);
              }}
              className="
                snap-center shrink-0 w-[55%] md:w-[28%] h-40
                rounded-2xl border-2 border-dashed border-brand-pop-shake/30
                bg-brand-pop-shake/5 hover:bg-brand-pop-shake/10
                hover:border-brand-pop-shake
                flex flex-col items-center justify-center p-6
                transition-all duration-200 text-brand-pop-shake
              "
            >
              <div className="w-10 h-10 rounded-full bg-brand-pop-shake/10 flex items-center justify-center mb-2">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-semibold text-xs uppercase tracking-widest text-center">
                Nova Promoção
              </span>
            </button>
          )}
        </div>
      </section>

      <PromotionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchPromos}
        promoToEdit={promoToEdit}
      />
    </>
  );
}
