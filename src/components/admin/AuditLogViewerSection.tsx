"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  summary: string;
  diffKeys: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const RESOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos os recursos" },
  { value: "store_settings", label: "Configurações da Loja & CNPJ" },
  { value: "courier", label: "Entregadores / Frota" },
  { value: "coupon", label: "Cupons de Desconto" },
  { value: "notification_campaign", label: "Disparos / Notificações" },
  { value: "notification_template", label: "Modelos de Mensagem" },
  { value: "audience_segment", label: "Listas de Audiência" },
  { value: "loyalty_badge_config", label: "Selos de Fidelidade" },
  { value: "card_badge", label: "Selos dos Cards" },
  { value: "banner", label: "Faixa / Banner da Vitrine" },
  { value: "avatar_preset", label: "Avatares Oficiais" },
  { value: "loading_settings", label: "Tela de Carregamento" },
  { value: "role", label: "Cargos & Permissões" },
  { value: "user", label: "Contas Administrativas / Usuários" },
  { value: "maintenance", label: "Manutenção / Limpeza" },
];

const ACTION_BADGE_MAP: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-200/60",
  DISPATCH: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200/60",
  PURGE: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60",
};

function formatDatePtBr(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

/**
 * Painel somente leitura exclusivo de Administradores para inspeção do `AdminAuditLog`.
 * Não exibe dados pessoais completos nem credenciais sensíveis.
 */
export function AuditLogViewerSection() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resourceType, setResourceType] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async (targetPage: number, resType: string, act: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "20",
      });
      if (resType) params.set("resourceType", resType);
      if (act) params.set("action", act);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Não foi possível carregar os registros de auditoria.");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
      setPage(Number(data.page || targetPage));
      setTotalPages(Math.max(1, Number(data.totalPages || 1)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao consultar auditoria.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, resourceType, action);
  }, [fetchLogs, page, resourceType, action]);

  return (
    <section className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide text-foreground">
              Trilha de Auditoria Administrativa
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registro imutável (somente leitura) de alterações sensíveis no painel, sanitizado sem dados pessoais.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => fetchLogs(page, resourceType, action)}
          disabled={loading}
          className="rounded-xl min-h-[44px] px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-zinc-50/70 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" /> Domínio / Recurso
          </label>
          <select
            value={resourceType}
            onChange={(e) => {
              setPage(1);
              setResourceType(e.target.value);
            }}
            className="w-full min-h-[44px] rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium px-3"
          >
            {RESOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tipo de Ação
          </label>
          <select
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value);
            }}
            className="w-full min-h-[44px] rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium px-3"
          >
            <option value="">Todas as ações</option>
            <option value="CREATE">CREATE (Criação)</option>
            <option value="UPDATE">UPDATE (Alteração)</option>
            <option value="DELETE">DELETE (Exclusão)</option>
            <option value="DISPATCH">DISPATCH (Disparo)</option>
            <option value="PURGE">PURGE (Expurgo)</option>
          </select>
        </div>

        <div className="flex items-end">
          <div className="w-full min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Total filtrado:</span>
            <span className="font-mono font-bold text-foreground">{total} registros</span>
          </div>
        </div>
      </div>

      {/* Estado de Erro */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Listagem */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs">Consultando registros de auditoria...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-border/60 rounded-2xl space-y-2">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
          <h4 className="font-bold text-sm text-foreground">Nenhum registro encontrado</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            As alterações realizadas em cargos, entregadores, cupons, banners, selos, canais e campanhas aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <>
          {/* Tabela Desktop */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-zinc-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-gray-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 font-bold">Data / Hora</th>
                  <th className="py-3 px-4 font-bold">Autor</th>
                  <th className="py-3 px-4 font-bold">Ação</th>
                  <th className="py-3 px-4 font-bold">Recurso</th>
                  <th className="py-3 px-4 font-bold">Resumo</th>
                  <th className="py-3 px-4 font-bold">Campos Alterados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                {items.map((item) => {
                  const badgeCls =
                    ACTION_BADGE_MAP[item.action] ||
                    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200";
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {formatDatePtBr(item.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] font-bold">
                          {item.actorRole}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badgeCls}`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-foreground">
                        {item.resourceType}
                      </td>
                      <td className="py-3 px-4 max-w-xs text-foreground">{item.summary}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(item.diffKeys || []).slice(0, 6).map((key) => (
                            <span
                              key={key}
                              className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px]"
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile */}
          <div className="md:hidden space-y-3">
            {items.map((item) => {
              const badgeCls =
                ACTION_BADGE_MAP[item.action] ||
                "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200";
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badgeCls}`}>
                        {item.action}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-foreground">
                        {item.resourceType}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatDatePtBr(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-foreground leading-relaxed">{item.summary}</p>
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">
                      Cargo: {item.actorRole}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(item.diffKeys || []).slice(0, 4).map((key) => (
                        <span
                          key={key}
                          className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px]"
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
            <span className="text-xs text-muted-foreground">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl min-h-[44px] px-3 text-xs font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl min-h-[44px] px-3 text-xs font-semibold cursor-pointer"
              >
                Próxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
