"use client";

import React, { useMemo, useState } from "react";
import { Package, X, Search, Flame, Activity, Snowflake } from "lucide-react";
import type { ProductStatEntry } from "@/domain/services/AnalyticsDomainService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyBRL } from "./AnalyticsTooltip";

interface AllProductsTurnoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  productStats: ProductStatEntry[];
}

export function AllProductsTurnoverModal({
  isOpen,
  onClose,
  productStats,
}: AllProductsTurnoverModalProps) {
  const [productSearch, setProductSearch] = useState("");
  const [productFilterType, setProductFilterType] = useState<"all" | "with_sales" | "no_sales">("all");

  const filteredProducts = useMemo(() => {
    return productStats
      .filter((p) => {
        if (productFilterType === "with_sales") return p.quantity > 0;
        if (productFilterType === "no_sales") return p.quantity === 0;
        return true;
      })
      .filter((p) => {
        if (!productSearch.trim()) return true;
        const q = productSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          Boolean(p.category && p.category.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (b.quantity !== a.quantity) return b.quantity - a.quantity;
        return b.revenue - a.revenue;
      });
  }, [productStats, productFilterType, productSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-card border border-border rounded-2xl md:rounded-3xl shadow-2xl p-6 flex flex-col overflow-hidden text-card-foreground">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Giro Completo de Produtos do Cardápio
              </h3>
              <p className="text-xs text-muted-foreground">
                Volume, faturamento e participação de todos os itens no período selecionado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-border/30">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar produto por nome ou categoria..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="h-9 pl-9 text-xs rounded-xl bg-background"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
            <button
              type="button"
              onClick={() => setProductFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                productFilterType === "all"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos ({productStats.length})
            </button>
            <button
              type="button"
              onClick={() => setProductFilterType("with_sales")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                productFilterType === "with_sales"
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Com Vendas ({productStats.filter((p) => p.quantity > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setProductFilterType("no_sales")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                productFilterType === "no_sales"
                  ? "bg-destructive text-white font-bold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Sem Vendas ({productStats.filter((p) => p.quantity === 0).length})
            </button>
          </div>
        </div>

        {/* Tabela de Produtos */}
        <div className="flex-1 overflow-auto w-full min-w-0 overscroll-contain-x my-2">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-md text-muted-foreground border-b border-border/50 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Produto</th>
                <th className="py-2.5 px-3 text-right">Preço</th>
                <th className="py-2.5 px-3 text-center">Qtd Vendida</th>
                <th className="py-2.5 px-3 text-right">Faturamento</th>
                <th className="py-2.5 px-3 text-right">Part. %</th>
                <th className="py-2.5 px-3 text-center">Giro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum produto corresponde aos filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const isHighGiro = p.quantity >= 5;
                  const isMediumGiro = p.quantity > 0 && p.quantity < 5;

                  return (
                    <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-muted-foreground">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-foreground">{p.name}</div>
                        {p.category && (
                          <div className="text-[10px] text-muted-foreground">{p.category}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {formatCurrencyBRL(p.price)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {p.quantity}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">un.</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyBRL(p.revenue)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        {p.revenueSharePct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isHighGiro ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                            <Flame className="w-3 h-3" /> Alto Giro
                          </span>
                        ) : isMediumGiro ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                            <Activity className="w-3 h-3" /> Médio Giro
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-muted-foreground">
                            <Snowflake className="w-3 h-3" /> Sem Saída
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé do Modal */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Exibindo <strong>{filteredProducts.length}</strong> de{" "}
            <strong>{productStats.length}</strong> produtos
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 px-4 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
