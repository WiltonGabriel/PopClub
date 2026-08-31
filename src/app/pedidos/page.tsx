"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Clock, MapPin, CheckCircle, ChevronLeft, RotateCcw, Loader2, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import { orderService, Order } from "../../services/orderService";
import { productService } from "../../services/productService";

export default function PedidosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"ativos" | "historico">("ativos");
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchOrders();
    }
  }, [user, loading, router]);

  const fetchOrders = async () => {
    setFetching(true);
    try {
      const data = await orderService.getOrdersByUser(user!.id);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const createMockOrder = async () => {
    try {
      setFetching(true);
      const prods = await productService.getProducts();
      if (prods.length === 0) {
        alert("Cadastre produtos primeiro.");
        setFetching(false);
        return;
      }
      await orderService.createOrder(
        user!.id,
        [
          { product_id: prods[0].id, quantity: 1, price: prods[0].price },
          { product_id: prods[Math.min(1, prods.length - 1)].id, quantity: 2, price: prods[Math.min(1, prods.length - 1)].price }
        ],
        null
      );
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Erro ao criar pedido.");
      setFetching(false);
    }
  };

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
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-surface/80 border-b border-border px-4 py-4 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-white/5 rounded-none transition-colors border-2 border-transparent hover:border-border">
          <ChevronLeft className="w-6 h-6 text-primary" />
        </Link>
        <h1 className="text-xl font-heading font-bold uppercase tracking-wide text-white">Meus Pedidos</h1>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6">
        <div className="flex bg-muted/50 p-1 rounded-none mb-6 border-2 border-border">
          <button 
            className={`flex-1 py-2 font-mono text-sm uppercase tracking-widest transition-colors ${activeTab === "ativos" ? "bg-primary text-primary-foreground font-bold shadow border-2 border-primary" : "text-muted-foreground hover:text-white"}`}
            onClick={() => setActiveTab("ativos")}
          >
            Ativos ({activeOrders.length})
          </button>
          <button 
            className={`flex-1 py-2 font-mono text-sm uppercase tracking-widest transition-colors ${activeTab === "historico" ? "bg-primary text-primary-foreground font-bold shadow border-2 border-primary" : "text-muted-foreground hover:text-white"}`}
            onClick={() => setActiveTab("historico")}
          >
            Histórico ({historyOrders.length})
          </button>
        </div>

        <div className="space-y-4">
          {activeTab === "ativos" && (
            activeOrders.length > 0 ? (
              activeOrders.map(order => (
                <div key={order.id} className="bg-card border-2 border-border p-4 shadow-[4px_4px_0px_0px_rgba(5,217,232,0.2)]">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-heading font-bold text-lg text-primary">Pedido {order.id.split('-')[0]}</h3>
                      <p className="text-sm font-sans text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-4 h-4" /> {new Date(order.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="bg-secondary/20 text-secondary border border-secondary px-3 py-1 text-xs font-mono uppercase tracking-wider rounded-none flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                      {order.status}
                    </div>
                  </div>
                  
                  <div className="border-t border-border/50 pt-4 mb-4">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm font-sans mb-2">
                        <span className="text-foreground"><span className="text-muted-foreground mr-2">{item.quantity}x</span>{item.product?.name || 'Produto'}</span>
                        <span className="text-foreground font-mono">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price_at_time)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center font-bold text-lg border-t border-border pt-4 mb-4">
                    <span className="font-heading uppercase text-muted-foreground text-sm">Total</span>
                    <span className="font-mono text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                    </span>
                  </div>

                  <Link href={`/rastreamento?id=${order.id}`} className="block">
                    <Button className="w-full h-12 bg-secondary hover:bg-secondary/90 text-background font-heading text-lg uppercase tracking-wider rounded-none">
                      <MapPin className="w-5 h-5 mr-2" />
                      Rastrear Entrega
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground font-sans">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Você não tem pedidos ativos no momento.</p>
                <Button 
                  onClick={createMockOrder} 
                  variant="outline" 
                  className="mt-6 rounded-none border-2 border-border font-mono uppercase tracking-widest text-xs hover:bg-white/5"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Gerar Pedido de Teste
                </Button>
              </div>
            )
          )}

          {activeTab === "historico" && (
            historyOrders.length > 0 ? (
              historyOrders.map(order => (
                <div key={order.id} className="bg-card border-2 border-border p-4 hover:border-border/80 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-heading font-bold text-lg text-foreground">Pedido {order.id.split('-')[0]}</h3>
                      <p className="text-sm font-sans text-muted-foreground flex items-center gap-1 mt-1">
                        <CheckCircle className="w-4 h-4 text-green-500" /> {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                      {order.status}
                    </div>
                  </div>
                  
                  <div className="border-t border-border/50 pt-4 mb-4">
                    <p className="text-sm font-sans text-foreground line-clamp-1">
                      {order.items?.map(i => `${i.quantity}x ${i.product?.name}`).join(", ")}
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-border pt-4">
                    <span className="font-mono text-primary font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                    </span>
                    <Button variant="outline" className="h-10 font-heading text-sm uppercase tracking-wider rounded-none border-2 bg-transparent text-foreground hover:bg-white/5">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Pedir Novamente
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground font-sans">
                <p>Nenhum pedido no histórico.</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
