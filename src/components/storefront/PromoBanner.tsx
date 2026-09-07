"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Star, Tag, Plus, Edit2, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { promotionService, Promotion } from "../../services/promotionService";
import { useAuth } from "../../hooks/useAuth";
import { PromotionFormDialog } from "../admin/PromotionFormDialog";

export function PromoBanner() {
  const { isAdmin } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [promoToEdit, setPromoToEdit] = useState<Promotion | null>(null);

  const fetchPromos = useCallback(async () => {
    try {
      setLoading(true);
      const data = isAdmin
        ? await promotionService.getAllPromotions()
        : await promotionService.getActivePromotions();
      setPromotions(data);
    } catch (err) {
      console.error("Erro ao buscar promoções dinâmicas:", err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

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
      } catch (err) {
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

  if (loading && promotions.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          <div className="shrink-0 w-[85%] md:w-[60%] h-40 bg-card border-2 border-border animate-pulse flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (!loading && promotions.length === 0 && !isAdmin) {
    return null; // Não exibe carrossel vazio se não houver admin
  }

  return (
    <>
      <section className="mb-8">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar">
          {promotions.map((promo) => {
            const bgGradient = `linear-gradient(to right, ${promo.gradientStart || "#9306CF"}, ${promo.gradientEnd || "#881BAA"})`;
            const hasBanner = Boolean(promo.bannerImageUrl);

            return (
              <div
                key={promo.id}
                className="group relative snap-center shrink-0 w-[85%] md:w-[60%] h-40 rounded-none border-2 border-border flex items-center p-6 overflow-hidden transition-all duration-300 hover:border-primary cursor-pointer shadow-sm hover:shadow-md"
                style={{ background: bgGradient }}
              >
                {/* Banner de Imagem se houver */}
                {hasBanner && (
                  <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-30 transition-opacity">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={promo.bannerImageUrl}
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Link clicável que envolve o conteúdo para navegar para /promo/[id] */}
                <Link href={`/promo/${promo.id}`} className="absolute inset-0 z-10 flex items-center p-6">
                  <div className="z-10 max-w-[70%]">
                    <span className="bg-background text-foreground text-[10px] font-mono uppercase px-2 py-1 tracking-widest mb-2 inline-block font-bold">
                      {promo.badge}
                    </span>
                    <h3 className="font-heading text-2xl font-bold uppercase tracking-tight text-white leading-none mb-1 truncate">
                      {promo.title}
                    </h3>
                    <p className="text-xs text-white/80 font-sans line-clamp-2 max-w-[280px]">
                      {promo.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white bg-black/40 px-2 py-0.5 inline-block">
                        {promo.discountType === "percentage"
                          ? `${promo.discountValue}% OFF`
                          : `R$ ${promo.discountValue.toFixed(2)} OFF`}
                      </span>
                      <span className="text-[11px] font-mono text-white/90 underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver combo <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  <div className="absolute -right-10 -bottom-10 opacity-25 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    {promo.title.toLowerCase().includes("shake") ? (
                      <Tag className="w-48 h-48 text-white" />
                    ) : (
                      <Star className="w-48 h-48 text-white" />
                    )}
                  </div>
                </Link>

                {/* Botões administrativos contextuais no card */}
                {isAdmin && (
                  <div className="absolute top-2 right-2 z-20 flex gap-1 bg-background/90 p-1 border-2 border-border shadow-md">
                    <button
                      onClick={(e) => handleEdit(e, promo)}
                      title="Editar Promoção"
                      className="p-1 text-primary hover:bg-muted transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, promo.id)}
                      title="Excluir Promoção"
                      className="p-1 text-destructive hover:bg-muted transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Botão administrativo para criar nova promoção diretamente no carrossel */}
          {isAdmin && (
            <button
              onClick={() => {
                setPromoToEdit(null);
                setDialogOpen(true);
              }}
              className="snap-center shrink-0 w-[60%] md:w-[30%] h-40 border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary flex flex-col items-center justify-center p-6 transition-all text-primary"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="font-mono text-xs uppercase tracking-widest font-bold text-center">
                + Nova Promoção
              </span>
            </button>
          )}
        </div>
      </section>

      {/* Modal de Gestão de Promoções */}
      <PromotionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchPromos}
        promoToEdit={promoToEdit}
      />
    </>
  );
}
