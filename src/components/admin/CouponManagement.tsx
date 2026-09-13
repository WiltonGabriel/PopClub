"use client";

import { useState, useEffect, useCallback } from "react";
import { couponService, Coupon } from "../../services/couponService";
import { CouponFormDialog } from "./CouponFormDialog";
import { Button } from "../ui/button";
import {
  Ticket,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  Percent,
  DollarSign,
  Layers,
  Loader2,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

export function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const data = await couponService.getCoupons();
      setCoupons(data);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar cupons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const nextStatus = !coupon.isActive;
    // Otimista
    setCoupons((prev) =>
      prev.map((c) => (c.id === coupon.id ? { ...c, isActive: nextStatus } : c))
    );

    try {
      await couponService.toggleCouponStatus(coupon.id, nextStatus);
    } catch (err: any) {
      alert("Erro ao alterar status do cupom");
      fetchCoupons();
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (confirm(`Tem certeza que deseja excluir o cupom "${code}"?`)) {
      try {
        await couponService.deleteCoupon(id);
        fetchCoupons();
      } catch (err: any) {
        alert(err.message || "Erro ao excluir cupom.");
      }
    }
  };

  // Métricas
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.isActive).length;
  const totalUses = coupons.reduce((sum, c) => sum + (c.uses || 0), 0);

  // Status helper
  const getCouponStatus = (coupon: Coupon) => {
    const now = new Date();
    if (!coupon.isActive) {
      return {
        label: "Inativo",
        color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
        icon: XCircle,
      };
    }
    if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
      return {
        label: "Expirado",
        color: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
        icon: Clock,
      };
    }
    if (coupon.maxUses && coupon.uses >= coupon.maxUses) {
      return {
        label: "Esgotado",
        color: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40",
        icon: AlertCircle,
      };
    }
    return {
      label: "Ativo",
      color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
      icon: CheckCircle2,
    };
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo de Cupons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-[#512B54]/30 pb-4">
        <div>
          <h3 className="font-heading text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
            <Ticket className="w-5 h-5 text-[#9306CF]" />
            Gestão de Cupons de Desconto
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Crie códigos promocionais em porcentagem ou valor fixo, com regras de validade e escopo específico de produtos.
          </p>
        </div>

        <Button
          onClick={() => {
            setCouponToEdit(null);
            setDialogOpen(true);
          }}
          className="bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-11 px-4 shadow-md shadow-[#9306CF]/20"
        >
          <Plus className="w-4 h-4" /> Novo Cupom
        </Button>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-[#9306CF] flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              Total de Cupons
            </span>
            <span className="font-heading font-black text-xl text-[#4C264F] dark:text-[#F9F5F9]">
              {totalCoupons}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              Cupons Ativos
            </span>
            <span className="font-heading font-black text-xl text-[#4C264F] dark:text-[#F9F5F9]">
              {activeCoupons}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              Usos Realizados
            </span>
            <span className="font-heading font-black text-xl text-[#4C264F] dark:text-[#F9F5F9]">
              {totalUses}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Cupons */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-7 h-7 text-[#9306CF] animate-spin" />
          <span className="text-xs text-gray-500">Carregando cupons...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl text-red-600 text-xs">
          {error}
        </div>
      ) : coupons.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-[#512B54]/40 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9306CF] flex items-center justify-center mx-auto text-xl">
            🎟️
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Nenhum cupom de desconto cadastrado no momento. Clique em &ldquo;Novo Cupom&rdquo; para criar o primeiro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => {
            const status = getCouponStatus(coupon);
            const StatusIcon = status.icon;
            const isCopied = copiedCode === coupon.code;
            const hasLimit = typeof coupon.maxUses === "number" && coupon.maxUses > 0;
            const usagePct = hasLimit ? Math.min(100, Math.round((coupon.uses / (coupon.maxUses || 1)) * 100)) : 0;

            return (
              <div
                key={coupon.id}
                className="bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-[#9306CF]/50 transition-colors"
              >
                {/* Faixa superior de cor */}
                <div
                  className={`h-1.5 w-full absolute top-0 left-0 ${
                    coupon.isActive ? "bg-gradient-to-r from-[#9306CF] to-[#940068]" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                />

                <div className="space-y-3 pt-1">
                  {/* Status Badge e 1-Click Toggle */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${status.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(coupon)}
                      title={coupon.isActive ? "Desativar cupom" : "Ativar cupom"}
                      className={`
                        relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out
                        ${coupon.isActive ? "bg-[#35A340]" : "bg-gray-300 dark:bg-gray-700"}
                      `}
                    >
                      <span
                        className={`
                          pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out
                          ${coupon.isActive ? "translate-x-4" : "translate-x-0"}
                        `}
                      />
                    </button>
                  </div>

                  {/* Código e Botão Copiar */}
                  <div className="flex items-center justify-between bg-white dark:bg-[#200B22] border border-gray-200 dark:border-[#512B54]/40 rounded-xl p-2.5">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-[#9306CF]" />
                      <span className="font-mono font-black text-sm tracking-wider text-[#4C264F] dark:text-[#F9F5F9]">
                        {coupon.code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(coupon.code)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
                      title="Copiar código"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Valor do Desconto em Destaque */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-heading font-black text-2xl text-emerald-600 dark:text-emerald-400">
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}% OFF`
                        : `R$ ${coupon.discountValue.toFixed(2).replace(".", ",")} OFF`}
                    </span>
                    {coupon.minOrderValue > 0 && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        (mín. R$ {coupon.minOrderValue.toFixed(2).replace(".", ",")})
                      </span>
                    )}
                  </div>

                  {/* Detalhes de Regras e Escopo */}
                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Layers className="w-3 h-3 text-[#9306CF]" /> Escopo:
                      </span>
                      <span className="font-semibold text-[#4C264F] dark:text-[#F9F5F9]">
                        {coupon.productIds && coupon.productIds.length > 0
                          ? `${coupon.productIds.length} produto(s) restrito(s)`
                          : "Toda a Loja"}
                      </span>
                    </div>

                    {coupon.expiresAt && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Calendar className="w-3 h-3 text-[#9306CF]" /> Expira em:
                        </span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          {new Date(coupon.expiresAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}

                    {/* Barra de Progresso de Usos */}
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-mono">
                        <span>Usos realizados:</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">
                          {coupon.uses} {hasLimit ? `/ ${coupon.maxUses}` : "(ilimitado)"}
                        </span>
                      </div>
                      {hasLimit && (
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#9306CF] to-emerald-500 transition-all duration-300"
                            style={{ width: `${usagePct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações de Edição e Exclusão */}
                <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-gray-200 dark:border-[#512B54]/30">
                  <button
                    type="button"
                    onClick={() => {
                      setCouponToEdit(coupon);
                      setDialogOpen(true);
                    }}
                    className="p-2 text-[#9306CF] hover:bg-[#9306CF]/10 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Editar cupom"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Excluir cupom"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição de Cupom */}
      <CouponFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchCoupons}
        couponToEdit={couponToEdit}
      />
    </div>
  );
}
