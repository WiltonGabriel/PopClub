"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Tag,
  AlertTriangle,
  MapPin,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { couponService, ValidatedCoupon } from "../../services/couponService";
import { orderService } from "../../services/orderService";
import { userService, UserLocation } from "../../services/userService";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export default function CarrinhoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    discountTotal: promoDiscount,
    itemsTotal,
    isLoaded,
  } = useCart();

  // Cupom de desconto
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Endereço estruturado (pronto para Google Maps)
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Local");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [zip, setZip] = useState("");

  // Endereços salvos do usuário autenticado
  const [savedLocations, setSavedLocations] = useState<UserLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Forma de pagamento
  const [paymentType, setPaymentType] = useState<"dinheiro" | "cartao_maquininha" | "pix_entrega">("dinheiro");
  const [changeFor, setChangeFor] = useState("");

  // Submissão do pedido
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);

  // Carrega endereços salvos se estiver logado
  useEffect(() => {
    if (user?.id) {
      userService.getLocations(user.id).then((locs) => {
        setSavedLocations(locs);
        const def = locs.find((l) => l.is_default) || locs[0];
        if (def) {
          setSelectedLocationId(def.id);
          setStreet(def.address_line);
        }
      }).catch(console.error);
    }
  }, [user]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setValidatingCoupon(true);
    setCouponError("");

    try {
      const res = await couponService.validateCoupon(couponInput.trim(), itemsTotal);
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponInput("");
      } else {
        setCouponError(res.message || "Cupom inválido.");
      }
    } catch {
      setCouponError("Erro ao validar cupom.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  // Cálculos finais
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalDiscount = Number((promoDiscount + couponDiscount).toFixed(2));
  const finalTotal = Math.max(0, Number((itemsTotal - couponDiscount).toFixed(2)));

  const handleFinishOrder = async () => {
    setCheckoutError("");

    if (items.length === 0) {
      setCheckoutError("Adicione itens ao carrinho antes de continuar.");
      return;
    }

    if (!street.trim() || !number.trim() || !neighborhood.trim()) {
      setCheckoutError("Preencha todos os campos obrigatórios de endereço (Rua, Número e Bairro).");
      return;
    }

    if (paymentType === "dinheiro" && changeFor) {
      const changeNum = parseFloat(changeFor);
      if (isNaN(changeNum) || changeNum < finalTotal) {
        setCheckoutError(`O valor para troco deve ser maior ou igual ao total do pedido (R$ ${finalTotal.toFixed(2)}).`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          promotionId: i.promotionId || null,
        })),
        deliveryAddress: {
          street: street.trim(),
          number: number.trim(),
          neighborhood: neighborhood.trim(),
          city: city.trim() || "Local",
          complement: complement.trim() || null,
          reference: reference.trim() || null,
          zip: zip.trim() || null,
        },
        paymentMethod: {
          type: paymentType,
          changeFor: paymentType === "dinheiro" && changeFor ? parseFloat(changeFor) : null,
        },
        couponCode: appliedCoupon?.code || null,
      };

      const result = await orderService.createCheckoutOrder(payload);
      setOrderSuccessId(result.order.id);
      clearCart();
    } catch (err: any) {
      setCheckoutError(err.message || "Erro ao processar pedido no servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Modal / Tela de Sucesso
  if (orderSuccessId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-success font-bold mb-2">
          Pedido Confirmado no PostgreSQL
        </span>
        <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
          Seu pedido foi recebido!
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mb-2 font-mono">
          Código do Pedido: <strong className="text-primary font-bold">#{orderSuccessId.substring(0, 8)}</strong>
        </p>
        <p className="text-muted-foreground text-xs max-w-md mb-8">
          A cozinha já iniciou o preparo. Lembre-se: o pagamento é realizado no momento da entrega!
        </p>

        <div className="flex gap-4">
          <Link
            href="/pedidos"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2"
          >
            Acompanhar Meus Pedidos <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="border-2 border-border hover:bg-muted px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold"
          >
            Voltar ao Cardápio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/90 border-b-2 border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-1.5 hover:bg-muted border-2 border-transparent hover:border-border transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-primary" />
          </Link>
          <h1 className="text-lg font-heading font-black tracking-tighter uppercase text-foreground">
            Meu Carrinho & Checkout
          </h1>
        </div>

        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs font-mono uppercase text-destructive hover:underline flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpar
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-8">
        {checkoutError && (
          <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive font-mono text-xs">
            {checkoutError}
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-card border-2 border-border p-12 text-center space-y-4">
            <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/40" />
            <h2 className="font-heading text-2xl font-bold uppercase">Seu carrinho está vazio</h2>
            <p className="text-sm font-sans text-muted-foreground max-w-sm mx-auto">
              Que tal experimentar um dos nossos açaís especiais ou nossos combos em promoção?
            </p>
            <Link
              href="/"
              className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold"
            >
              Explorar Cardápio
            </Link>
          </div>
        ) : (
          <>
            {/* 1. Lista de Itens */}
            <section className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Itens Selecionados ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>

              <div className="divide-y divide-border/60">
                {items.map((item) => (
                  <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-14 h-14 bg-muted border border-border shrink-0 overflow-hidden relative flex items-center justify-center">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground">ITEM</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-bold text-base truncate">{item.name}</h4>
                          {item.promotionId && (
                            <span className="bg-primary text-primary-foreground text-[9px] font-mono uppercase px-1.5 py-0.5 font-bold shrink-0">
                              PROMO
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono font-bold text-primary text-sm">
                            R$ {item.price.toFixed(2).replace(".", ",")}
                          </span>
                          {item.originalPrice > item.price && (
                            <span className="font-mono text-xs text-muted-foreground line-through">
                              R$ {item.originalPrice.toFixed(2).replace(".", ",")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Controles de Quantidade */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center border-2 border-border bg-background">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Diminuir quantidade"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 font-mono font-bold text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Aumentar quantidade"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-mono font-bold text-sm min-w-[70px] text-right">
                        R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                      </span>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Cupom de Desconto */}
            <section className="bg-card border-2 border-border p-6 shadow-sm">
              <h3 className="font-heading text-lg font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
                <Tag className="w-5 h-5 text-secondary" />
                Cupom de Desconto
              </h3>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-success/15 border-2 border-success p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <span className="font-mono text-xs uppercase font-bold text-success">
                        Cupom {appliedCoupon.code} aplicado com sucesso!
                      </span>
                      <p className="text-xs text-muted-foreground font-mono">
                        Desconto: - R$ {appliedCoupon.discountAmount.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs font-mono uppercase text-destructive hover:underline"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <Input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Ex: BEMVINDO10 ou POPSHAKE5"
                    className="rounded-none border-2 border-border font-mono text-xs uppercase flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={validatingCoupon || !couponInput.trim()}
                    className="rounded-none bg-secondary hover:bg-secondary/90 text-white font-mono text-xs uppercase tracking-wider font-bold px-5"
                  >
                    {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                  </Button>
                </form>
              )}

              {couponError && (
                <p className="text-destructive font-mono text-xs mt-2">{couponError}</p>
              )}
            </section>

            {/* 3. Endereço de Entrega Estruturado (Compatível com Google Maps) */}
            <section className="bg-card border-2 border-border p-6 shadow-sm space-y-4">
              <h3 className="font-heading text-lg font-bold uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Endereço de Entrega
              </h3>

              {/* Se o usuário tiver endereços salvos */}
              {savedLocations.length > 0 && (
                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Usar endereço salvo:
                  </Label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => {
                      setSelectedLocationId(e.target.value);
                      const found = savedLocations.find((l) => l.id === e.target.value);
                      if (found) setStreet(found.address_line);
                    }}
                    className="w-full bg-background border-2 border-border rounded-none p-2.5 font-mono text-xs"
                  >
                    {savedLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name ? `${l.name} - ` : ""}{l.address_line}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Logradouro / Rua *
                  </Label>
                  <Input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Ex: Av. Beira Mar"
                    className="rounded-none border-2 border-border text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Número *
                  </Label>
                  <Input
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Ex: 1420"
                    className="rounded-none border-2 border-border text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Bairro *
                  </Label>
                  <Input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex: Centro"
                    className="rounded-none border-2 border-border text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Cidade / UF
                  </Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Cidade"
                    className="rounded-none border-2 border-border text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    CEP
                  </Label>
                  <Input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="00000-000"
                    className="rounded-none border-2 border-border text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Complemento (Apto, Bloco...)
                  </Label>
                  <Input
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Ex: Apto 302 Bloco B"
                    className="rounded-none border-2 border-border text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Ponto de Referência
                  </Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ex: Próximo à praça central"
                    className="rounded-none border-2 border-border text-xs"
                  />
                </div>
              </div>
            </section>

            {/* 4. Forma de Pagamento & AVISO VISUAL DESTACADO */}
            <section className="bg-card border-2 border-border p-6 shadow-sm space-y-4">
              <h3 className="font-heading text-lg font-bold uppercase tracking-wide flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Forma de Pagamento
              </h3>

              {/* CRITICAL: AVISO VISUAL DESTACADO DE PAGAMENTO NA ENTREGA */}
              <div className="bg-amber-500/15 border-2 border-amber-500 p-4 flex items-start gap-3 shadow-md">
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-heading font-black text-sm uppercase tracking-wide text-amber-300">
                    AVISO IMPORTANTE: Pagamento Exclusivo na Entrega
                  </h4>
                  <p className="text-xs font-sans text-foreground/90 mt-1 leading-relaxed">
                    Nenhum valor é cobrado online neste momento. O pagamento deve ser feito
                    <strong> diretamente ao entregador</strong> na chegada do pedido via dinheiro,
                    cartão na maquininha ou Pix.
                  </p>
                </div>
              </div>

              {/* Seleção do Método */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentType("dinheiro")}
                  className={`p-4 border-2 flex flex-col items-center justify-center gap-2 text-center transition-all ${
                    paymentType === "dinheiro"
                      ? "border-primary bg-primary/10 shadow-[4px_4px_0px_0px_rgba(147,6,207,0.3)]"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Banknote className="w-6 h-6 text-primary" />
                  <span className="font-heading font-bold uppercase text-xs">Dinheiro</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Pague na entrega</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType("cartao_maquininha")}
                  className={`p-4 border-2 flex flex-col items-center justify-center gap-2 text-center transition-all ${
                    paymentType === "cartao_maquininha"
                      ? "border-primary bg-primary/10 shadow-[4px_4px_0px_0px_rgba(147,6,207,0.3)]"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <CreditCard className="w-6 h-6 text-secondary" />
                  <span className="font-heading font-bold uppercase text-xs">Cartão (Maquininha)</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Débito ou Crédito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType("pix_entrega")}
                  className={`p-4 border-2 flex flex-col items-center justify-center gap-2 text-center transition-all ${
                    paymentType === "pix_entrega"
                      ? "border-primary bg-primary/10 shadow-[4px_4px_0px_0px_rgba(147,6,207,0.3)]"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <QrCode className="w-6 h-6 text-success" />
                  <span className="font-heading font-bold uppercase text-xs">Pix na Entrega</span>
                  <span className="text-[10px] text-muted-foreground font-mono">QR Code com entregador</span>
                </button>
              </div>

              {/* Campo de Troco se Dinheiro */}
              {paymentType === "dinheiro" && (
                <div className="pt-2 border-t border-border mt-3 space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Precisa de troco para quanto? (Opcional)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={`Ex: ${(Math.ceil(finalTotal / 10) * 10 + 10).toFixed(2)}`}
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                    className="rounded-none border-2 border-border text-xs font-mono max-w-xs"
                  />
                </div>
              )}
            </section>

            {/* 5. Resumo de Valores e Envio */}
            <section className="bg-card border-2 border-border p-6 shadow-sm space-y-3">
              <h3 className="font-heading text-lg font-bold uppercase tracking-wide mb-3">
                Resumo do Pedido
              </h3>

              <div className="space-y-2 font-mono text-xs border-b border-border pb-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
                </div>

                {promoDiscount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Desconto das Promoções:</span>
                    <span>- R$ {promoDiscount.toFixed(2).replace(".", ",")}</span>
                  </div>
                )}

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Desconto do Cupom ({appliedCoupon?.code}):</span>
                    <span>- R$ {couponDiscount.toFixed(2).replace(".", ",")}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>Taxa de Entrega:</span>
                  <span className="text-success font-bold uppercase">Grátis</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-2">
                <span className="font-mono text-sm uppercase tracking-wider font-bold">
                  Total a Pagar na Entrega:
                </span>
                <span className="font-heading text-3xl font-black text-primary">
                  R$ {finalTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Barra de Ação Fixa Inferior */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-card border-t-2 border-border p-4 z-40 shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                Total (Pagamento na Entrega)
              </span>
              <span className="font-heading text-2xl font-black text-primary">
                R$ {finalTotal.toFixed(2).replace(".", ",")}
              </span>
            </div>

            <Button
              onClick={handleFinishOrder}
              disabled={submitting}
              className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-none font-heading text-base uppercase tracking-wider font-bold px-8 shadow-lg flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processando Pedido...
                </>
              ) : (
                <>
                  Confirmar e Fazer Pedido
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
