"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShoppingBag, Check, Sparkles, Tag, ArrowRight, Loader2 } from "lucide-react";
import { promotionService, Promotion } from "../../../services/promotionService";
import { useCart } from "../../../hooks/useCart";
import { Button } from "../../../components/ui/button";

export default function PromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { addItem, totalItems } = useCart();

  const [promo, setPromo] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    promotionService
      .getPromotionById(id)
      .then(setPromo)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddPromoToCart = () => {
    if (!promo || !promo.product) return;

    const originalPrice = promo.product.price;
    let finalPrice = originalPrice;
    if (promo.discountType === "percentage") {
      finalPrice = Number((originalPrice * (1 - promo.discountValue / 100)).toFixed(2));
    } else {
      finalPrice = Math.max(0, originalPrice - promo.discountValue);
    }

    addItem({
      productId: promo.product.id,
      name: `${promo.product.name} (${promo.title})`,
      price: finalPrice,
      originalPrice: originalPrice,
      quantity: 1,
      imageUrl: promo.product.imageUrl,
      promotionId: promo.id,
      promotionTitle: promo.title,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !promo) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <h2 className="font-heading text-2xl font-bold uppercase mb-2">Promoção não encontrada</h2>
        <p className="text-muted-foreground text-sm font-sans mb-6">
          Esta promoção pode ter sido encerrada ou não está mais disponível.
        </p>
        <Link href="/" className="border-2 border-primary bg-primary/10 text-primary px-4 py-2 font-mono text-xs uppercase font-bold hover:bg-primary hover:text-white transition-colors">
          Voltar para o Cardápio
        </Link>
      </div>
    );
  }

  const bgGradient = `linear-gradient(135deg, ${promo.gradientStart || "hsl(var(--primary))"}, ${promo.gradientEnd || "#881BAA"})`;

  const originalPrice = promo.product?.price || 0;
  let finalPrice = originalPrice;
  if (promo.discountType === "percentage") {
    finalPrice = Number((originalPrice * (1 - promo.discountValue / 100)).toFixed(2));
  } else {
    finalPrice = Math.max(0, originalPrice - promo.discountValue);
  }
  const discountAmount = Math.max(0, originalPrice - finalPrice);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-28">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/90 border-b-2 border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-1.5 hover:bg-muted border-2 border-transparent hover:border-border transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-primary" />
          </Link>
          <span className="text-lg font-heading font-black tracking-tighter uppercase text-foreground">
            Pop<span className="text-primary">Club</span>
          </span>
        </div>

        <Link
          href="/carrinho"
          className="flex items-center gap-2 border-2 border-primary bg-primary/10 text-primary px-3 py-1.5 hover:bg-primary hover:text-white transition-colors font-mono text-xs uppercase tracking-widest font-bold"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Carrinho ({totalItems})</span>
        </Link>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Banner Hero Imersivo */}
        <div
          className="w-full rounded-none border-2 border-border p-8 relative overflow-hidden shadow-md flex flex-col justify-end min-h-[220px]"
          style={{ background: bgGradient }}
        >
          {promo.bannerImageUrl && (
            <div className="absolute inset-0 z-0 opacity-30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={promo.bannerImageUrl}
                alt={promo.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="relative z-10 max-w-xl">
            <span className="bg-background text-foreground text-xs font-mono uppercase px-3 py-1 tracking-widest mb-3 inline-block font-bold">
              {promo.badge}
            </span>
            <h1 className="font-heading text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-white leading-tight mb-2">
              {promo.title}
            </h1>
            <p className="text-sm md:text-base text-white/90 font-sans">
              {promo.description}
            </p>
          </div>

          <div className="absolute right-4 bottom-4 opacity-20 pointer-events-none hidden md:block">
            <Tag className="w-48 h-48 text-white" />
          </div>
        </div>

        {/* Itens Inclusos na Promoção */}
        <section className="bg-card border-2 border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-xl font-bold uppercase tracking-wide">
              Produto em Oferta
            </h2>
          </div>

          <div className="space-y-4">
            {promo.product ? (
              <div
                key={promo.product.id}
                className="flex items-center gap-4 bg-background border-2 border-border p-4 transition-all hover:border-accent"
              >
                <div className="w-20 h-20 bg-muted border border-border shrink-0 overflow-hidden relative flex items-center justify-center">
                  {promo.product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={promo.product.imageUrl}
                      alt={promo.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-muted-foreground font-mono text-xs">AÇAÍ</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/20 text-primary px-2 py-0.5 font-mono text-xs font-bold">
                      1x
                    </span>
                    <h3 className="font-heading font-bold text-foreground text-lg truncate">
                      {promo.product.name}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                    {promo.product.description}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm font-mono text-muted-foreground">
                Nenhum produto individual listado nesta promoção.
              </p>
            )}
          </div>
        </section>

        {/* Resumo Financeiro & Desconto */}
        <section className="bg-card border-2 border-border p-6 shadow-sm">
          <h3 className="font-heading text-lg font-bold uppercase tracking-wide mb-4">
            Resumo do Desconto
          </h3>

          <div className="space-y-3 font-mono text-sm border-b border-border pb-4">
            <div className="flex justify-between text-muted-foreground">
              <span>Valor Original do Produto:</span>
              <span>R$ {originalPrice.toFixed(2).replace(".", ",")}</span>
            </div>

            <div className="flex justify-between text-success font-bold">
              <span className="flex items-center gap-1">
                Desconto da Promoção ({promo.discountType === "percentage" ? `${promo.discountValue}%` : `R$ ${promo.discountValue}`}):
              </span>
              <span>
                - R$ {discountAmount.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>

          <div className="pt-4 flex justify-between items-baseline">
            <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground font-bold">
              Preço Final do Produto:
            </span>
            <div className="text-right">
              <span className="font-heading text-3xl font-black text-primary">
                R$ {finalPrice.toFixed(2).replace(".", ",")}
              </span>
              <span className="block text-[10px] font-mono text-success uppercase font-bold">
                Economia de R$ {discountAmount.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Barra Flutuante de Ação */}
      <div className="fixed bottom-0 left-0 w-full bg-card border-t-2 border-border p-4 z-40 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              Total com Desconto
            </span>
            <span className="font-heading text-2xl font-bold text-primary">
              R$ {finalPrice.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <div className="flex gap-3">
            {added ? (
              <Button
                onClick={() => router.push("/carrinho")}
                className="h-12 bg-success text-white hover:bg-success/90 rounded-none font-mono text-xs uppercase tracking-wider font-bold px-6 flex items-center gap-2"
              >
                <Check className="w-5 h-5" /> Adicionado! Ir para o Carrinho <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleAddPromoToCart}
                className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-none font-heading text-base uppercase tracking-wider font-bold px-6 flex items-center gap-2 shadow-lg"
              >
                <ShoppingBag className="w-5 h-5" />
                Adicionar Oferta ao Carrinho
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
