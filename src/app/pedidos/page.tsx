"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle, ChevronLeft, RotateCcw, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import { orderService, Order } from "../../services/orderService";

export default function PedidosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"ativos" | "historico">("ativos");
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchOrders = useCallback(async () => {
    setFetching(true);
    try {
      const data = await orderService.getOrdersByUser();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchOrders();
    }
  }, [user, loading, router, fetchOrders]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isOrderActive = (status: string) => !['completed', 'cancelled'].includes(status);
  
  const activeOrders = orders.filter(o => isOrderActive(o.status));
  const historyOrders = orders.filter(o => !isOrderActive(o.status));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/90 border-b-2 border-border px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 hover:bg-muted border-2 border-transparent hover:border-border transition-colors">
            <ChevronLeft className="w-6 h-6 text-primary" />
          </Link>
          <h1 className="text-xl font-heading font-bold uppercase tracking-wide text-foreground">Meus Pedidos</h1>
        </div>

        <Link href="/carrinho" className="flex items-center gap-2 border-2 border-border px-3 py-1.5 hover:bg-muted text-xs font-mono uppercase">
          <ShoppingBag className="w-4 h-4 text-primary" />
          Ver Carrinho
        </Link>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6">
        <div className="flex bg-muted/50 p-1 rounded-none mb-6 border-2 border-border">
          <button 
            className={`flex-1 py-2 font-mono text-sm uppercase tracking-widest transition-colors ${activeTab === "ativos" ? "bg-primary text-primary-foreground font-bold shadow border-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("ativos")}
          >
            Ativos ({activeOrders.length})
          </button>
          <button 
            className={`flex-1 py-2 font-mono text-sm uppercase tracking-widest transition-colors ${activeTab === "historico" ? "bg-primary text-primary-foreground font-bold shadow border-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("historico")}
          >
            Histórico ({historyOrders.length})
          </button>
        </div>

        <div className="space-y-4">
          {activeTab === "ativos" && (
            activeOrders.length > 0 ? (
              activeOrders.map(order => (
                <div key={order.id} className="bg-card border-2 border-border p-4 shadow-[4px_4px_0px_0px_rgba(147,6,207,0.2)]">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-heading font-bold text-lg text-primary">Pedido #{order.id.substring(0, 8)}</h3>
                      <p className="text-sm font-sans text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-4 h-4" /> {new Date(order.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="bg-secondary/20 text-secondary border border-secondary px-3 py-1 text-xs font-mono uppercase tracking-wider rounded-none flex items-center gap-2 font-bold">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                      {order.status}
                    </div>
                  </div>
                  
                  <div className="border-t border-border/50 pt-3 mb-3">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm font-sans mb-1.5">
                        <span className="text-foreground">
                          <span className="text-primary font-bold mr-2">{item.quantity}x</span>
                          {item.product?.name || 'Item'}
                        </span>
                        <span className="text-foreground font-mono">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price_at_time * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.delivery_address && (
                    <div className="bg-background/50 p-2.5 border border-border/60 text-xs font-mono text-muted-foreground mb-3">
                      Entrega: {order.delivery_address.street}, {order.delivery_address.number} - {order.delivery_address.neighborhood}
                    </div>
                  )}

                  <div className="flex justify-between items-center font-bold text-lg border-t border-border pt-3 mb-4">
                    <span className="font-heading uppercase text-muted-foreground text-sm">Total (Pago na entrega)</span>
                    <span className="font-mono text-primary text-xl">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                    </span>
                  </div>

                  <Link href={`/rastreamento?id=${order.id}`} className="block">
                    <Button className="w-full h-11 bg-secondary hover:bg-secondary/90 text-white font-heading text-sm uppercase tracking-wider rounded-none font-bold">
                      Acompanhar Entrega em Tempo Real
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground font-sans bg-card border-2 border-border p-6">
                <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium">Você não tem pedidos em andamento no momento.</p>
                <Link 
                  href="/"
                  className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-widest font-bold hover:bg-primary/90"
                >
                  Fazer meu primeiro pedido
                </Link>
              </div>
            )
          )}

          {activeTab === "historico" && (
            historyOrders.length > 0 ? (
              historyOrders.map(order => (
                <div key={order.id} className="bg-card border-2 border-border p-4 hover:border-border/80 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-heading font-bold text-lg text-foreground">Pedido #{order.id.substring(0, 8)}</h3>
                      <p className="text-sm font-sans text-muted-foreground flex items-center gap-1 mt-1">
                        <CheckCircle className="w-4 h-4 text-success" /> {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider font-bold">
                      {order.status}
                    </div>
                  </div>
                  
                  <div className="border-t border-border/50 pt-3 mb-3">
                    <p className="text-sm font-sans text-foreground line-clamp-1">
                      {order.items?.map(i => `${i.quantity}x ${i.product?.name}`).join(", ")}
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-border pt-3">
                    <span className="font-mono text-primary font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                    </span>
                    <Link href="/">
                      <Button variant="outline" className="h-9 font-mono text-xs uppercase tracking-wider rounded-none border-2 bg-transparent text-foreground hover:bg-white/5">
                        <RotateCcw className="w-3.5 h-3.5 mr-2" />
                        Pedir Novamente
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground font-sans bg-card border-2 border-border p-6">
                <p>Nenhum pedido no histórico.</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
