"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ShieldCheck, Wrench, X, AlertTriangle, Loader2, Info } from "lucide-react";
import { AddonAuditIssue } from "@/domain/services/AddonOrganizationService";
import { Button } from "@/components/ui/button";

export function isFixableAddonAuditIssue(issue: AddonAuditIssue): boolean {
  return (
    issue.code === "CUTLERY_NOT_LAST" ||
    issue.code === "MISSING_ITEM_QUANTITY_SUPPORT" ||
    issue.code === "REDUNDANT_COMBO_GROUP"
  );
}

export function getAddonAuditIssueKey(issue: AddonAuditIssue, index: number): string {
  return `${issue.code}:${issue.groupId || ""}:${issue.productId || ""}:${index}`;
}

function getPlainActionSummary(issue: AddonAuditIssue): string {
  switch (issue.code) {
    case "CUTLERY_NOT_LAST":
      return "Ação: move a exibição de talheres/colheres para o final da lista, mantendo seus itens intactos.";
    case "MISSING_ITEM_QUANTITY_SUPPORT":
      return "Ação: ativa o seletor de quantidade (+ / -) para este grupo de talheres/acessórios.";
    case "REDUNDANT_COMBO_GROUP":
      return "Ação: remove apenas vínculos legados redundantes no cadastro pai do combo (os complementos continuam vindo dos itens vinculados ao combo).";
    default:
      return "Informativo apenas — requer revisão manual se necessário.";
  }
}

interface AddonAuditReviewModalProps {
  open: boolean;
  issues: AddonAuditIssue[];
  hasUnsavedDraft: boolean;
  applying: boolean;
  onClose: () => void;
  onApplySelected: (selectedIssues: AddonAuditIssue[]) => Promise<void>;
}

export function AddonAuditReviewModal({
  open,
  issues,
  hasUnsavedDraft,
  applying,
  onClose,
  onApplySelected,
}: AddonAuditReviewModalProps) {
  const fixableEntries = useMemo(
    () =>
      issues
        .map((issue, idx) => ({ issue, key: getAddonAuditIssueKey(issue, idx) }))
        .filter(({ issue }) => isFixableAddonAuditIssue(issue)),
    [issues]
  );

  const infoOnlyIssues = useMemo(
    () => issues.filter((issue) => !isFixableAddonAuditIssue(issue)),
    [issues]
  );

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelectedKeys(new Set(fixableEntries.map((entry) => entry.key)));
    }
  }, [open, fixableEntries]);

  if (!open) return null;

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectedIssues = fixableEntries
    .filter((entry) => selectedKeys.has(entry.key))
    .map((entry) => entry.issue);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !applying && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                Revisar Correções de Ordem & Combos
              </h4>
              <p className="text-xs text-muted-foreground">
                Escolha exatamente quais ajustes automáticos deseja aplicar no banco de dados.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={applying}
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
            aria-label="Fechar revisão"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Garantia de Segurança */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/40 flex items-start gap-2.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-emerald-900 dark:text-emerald-200">
            <p className="font-bold">
              Segurança garantida: seus grupos e complementos nunca serão apagados ou renomeados.
            </p>
            <p className="text-[11px] opacity-90">
              Estas correções ajustam apenas ordenação de descartáveis, suporte a quantidade (+ / -) e limpeza de vínculos legados redundantes em combos.
            </p>
          </div>
        </div>

        {/* Alerta caso haja rascunho pendente */}
        {hasUnsavedDraft && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Salve ou descarte suas alterações antes de continuar</p>
              <p className="text-[11px] opacity-90">
                Há edições pendentes na barra &quot;Salvar Tudo&quot;. Aplique ou descarte o rascunho antes de rodar as correções estruturais para evitar conflitos.
              </p>
            </div>
          </div>
        )}

        {/* Lista de Correções Selecionáveis */}
        {fixableEntries.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">
                Correções disponíveis ({fixableEntries.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedKeys(new Set(fixableEntries.map((e) => e.key)))}
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  Marcar todas
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedKeys(new Set())}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {fixableEntries.map(({ issue, key }) => {
                const checked = selectedKeys.has(key);
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      checked
                        ? "bg-primary/5 border-primary/40"
                        : "bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-75"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleKey(key)}
                      className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
                    />
                    <div className="space-y-1 text-xs min-w-0">
                      <p className="font-bold text-foreground">{issue.title}</p>
                      <p className="text-muted-foreground leading-snug">{issue.description}</p>
                      <p className="text-[11px] font-medium text-primary dark:text-violet-300">
                        {getPlainActionSummary(issue)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-border/50 text-xs text-muted-foreground text-center">
            Nenhuma correção automática aplicável encontrada neste momento.
          </div>
        )}

        {/* Alertas apenas informativos */}
        {infoOnlyIssues.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Alertas informativos ({infoOnlyIssues.length}) — nenhuma ação automática será feita:
            </p>
            <div className="space-y-1.5">
              {infoOnlyIssues.map((issue, idx) => (
                <div
                  key={`info-${idx}`}
                  className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800 text-[11px]"
                >
                  <p className="font-bold text-foreground">{issue.title}</p>
                  <p className="text-muted-foreground mt-0.5">{issue.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={applying}
            onClick={onClose}
            className="rounded-xl h-9 text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={applying || hasUnsavedDraft || selectedIssues.length === 0}
            onClick={() => onApplySelected(selectedIssues)}
            className="rounded-xl h-9 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {applying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <Wrench className="w-3.5 h-3.5 mr-1.5" />
                Aplicar Selecionadas ({selectedIssues.length})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
