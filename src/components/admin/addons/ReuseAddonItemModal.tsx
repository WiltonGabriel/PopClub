"use client";

import React, { useMemo, useState } from "react";
import { Check, CopyPlus, Search, X } from "lucide-react";
import type { AddonGroup, AddonItem } from "@/services/addonService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReusableCandidate {
  dedupeKey: string;
  sourceItem: AddonItem;
  sourceGroups: string[];
  alreadyInTarget: boolean;
}

export interface ReuseAddonSelection {
  sourceItemId: string;
  price: number;
}

interface ReuseAddonItemModalProps {
  open: boolean;
  targetGroup: AddonGroup | null;
  allGroups: AddonGroup[];
  onClose: () => void;
  onConfirm: (selections: ReuseAddonSelection[]) => void;
}

export function ReuseAddonItemModal({
  open,
  targetGroup,
  allGroups,
  onClose,
  onConfirm,
}: ReuseAddonItemModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});

  const candidates = useMemo<ReusableCandidate[]>(() => {
    if (!targetGroup) return [];

    const targetCatalogKeys = new Set(
      targetGroup.items
        .map((i) => i.catalogKey?.trim())
        .filter((k): k is string => Boolean(k))
    );
    const targetNames = new Set(
      targetGroup.items.map((i) => i.name.trim().toLowerCase())
    );

    const byKey = new Map<string, ReusableCandidate>();
    for (const group of allGroups) {
      if (group.id === targetGroup.id) continue;
      for (const item of group.items) {
        const keyPart = item.catalogKey?.trim()
          ? `cat:${item.catalogKey.trim()}`
          : `name:${item.name.trim().toLowerCase()}::img:${item.imageUrl || ""}`;

        const normalizedName = item.name.trim().toLowerCase();
        const itemCatalogKey = item.catalogKey?.trim();
        const alreadyInTarget =
          Boolean(itemCatalogKey && targetCatalogKeys.has(itemCatalogKey)) ||
          targetNames.has(normalizedName);

        const existing = byKey.get(keyPart);
        if (existing) {
          if (!existing.sourceGroups.includes(group.name)) {
            existing.sourceGroups.push(group.name);
          }
          if (!existing.sourceItem.imageUrl && item.imageUrl) {
            existing.sourceItem = item;
          }
          existing.alreadyInTarget = existing.alreadyInTarget || alreadyInTarget;
        } else {
          byKey.set(keyPart, {
            dedupeKey: keyPart,
            sourceItem: item,
            sourceGroups: [group.name],
            alreadyInTarget,
          });
        }
      }
    }

    return Array.from(byKey.values()).sort((a, b) =>
      a.sourceItem.name.localeCompare(b.sourceItem.name, "pt-BR")
    );
  }, [allGroups, targetGroup]);

  const filteredCandidates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return candidates;
    return candidates.filter(
      (c) =>
        c.sourceItem.name.toLowerCase().includes(query) ||
        c.sourceGroups.some((g) => g.toLowerCase().includes(query))
    );
  }, [candidates, searchTerm]);

  const selectedList = useMemo(
    () =>
      candidates.filter(
        (c) => !c.alreadyInTarget && Boolean(selectedIds[c.sourceItem.id])
      ),
    [candidates, selectedIds]
  );

  if (!open || !targetGroup) return null;

  const handleToggle = (candidate: ReusableCandidate) => {
    if (candidate.alreadyInTarget) return;
    const itemId = candidate.sourceItem.id;
    setSelectedIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
    setPriceOverrides((prev) => {
      if (prev[itemId] !== undefined) return prev;
      return {
        ...prev,
        [itemId]: Number(candidate.sourceItem.price || 0).toFixed(2),
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedList.length === 0) return;

    const selections: ReuseAddonSelection[] = selectedList.map((c) => {
      const rawPrice = priceOverrides[c.sourceItem.id];
      const parsed =
        rawPrice !== undefined
          ? parseFloat(rawPrice.replace(",", "."))
          : Number(c.sourceItem.price || 0);
      return {
        sourceItemId: c.sourceItem.id,
        price: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
      };
    });

    onConfirm(selections);
    setSelectedIds({});
    setPriceOverrides({});
    setSearchTerm("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-[calc(100vw-1.5rem)] max-w-2xl bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-zinc-800 pb-3 shrink-0">
          <div>
            <h4 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CopyPlus className="w-5 h-5 text-primary" />
              Reutilizar Complementos Existentes
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Destino: <strong className="text-foreground">{targetGroup.name}</strong> • Cada grupo mantém seu próprio preço. Complementos duplicados já existentes não são removidos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar complemento ou grupo de origem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900/60"
          />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
            {filteredCandidates.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                Nenhum complemento de outro grupo encontrado para reutilização.
              </div>
            ) : (
              filteredCandidates.map((candidate) => {
                const { sourceItem, sourceGroups, alreadyInTarget } = candidate;
                const isChecked = !alreadyInTarget && Boolean(selectedIds[sourceItem.id]);
                const priceValue =
                  priceOverrides[sourceItem.id] ??
                  Number(sourceItem.price || 0).toFixed(2);

                return (
                  <div
                    key={candidate.dedupeKey}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                      alreadyInTarget
                        ? "bg-zinc-100/70 dark:bg-zinc-900/40 border-zinc-200/70 dark:border-zinc-800/60 opacity-60"
                        : isChecked
                        ? "bg-primary/5 border-primary ring-1 ring-primary/30"
                        : "bg-zinc-50/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-primary/40"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={alreadyInTarget}
                      onClick={() => handleToggle(candidate)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          alreadyInTarget
                            ? "border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800"
                            : isChecked
                            ? "border-primary bg-primary text-white"
                            : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </span>

                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                        {sourceItem.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={sourceItem.imageUrl}
                            alt={sourceItem.name}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading font-bold text-xs text-foreground truncate">
                            {sourceItem.name}
                          </span>
                          {alreadyInTarget && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              Já neste grupo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Origem: {sourceGroups.join(", ")}
                        </p>
                      </div>
                    </button>

                    {!alreadyInTarget && (
                      <div className="flex items-center gap-2 pl-8 sm:pl-0 shrink-0">
                        <label className="text-[11px] text-muted-foreground font-semibold">
                          Preço neste grupo (R$):
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={priceValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPriceOverrides((prev) => ({ ...prev, [sourceItem.id]: val }));
                            setSelectedIds((prev) => ({ ...prev, [sourceItem.id]: true }));
                          }}
                          className="w-24 h-8 text-xs font-mono rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800 shrink-0">
            <span className="text-xs text-muted-foreground">
              {selectedList.length === 0
                ? "Selecione um ou mais complementos acima"
                : `${selectedList.length} opção(ões) selecionada(s)`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-xl h-9 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={selectedList.length === 0}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl h-9 text-xs font-bold cursor-pointer"
              >
                <CopyPlus className="w-3.5 h-3.5 mr-1.5" />
                Reutilizar Selecionados ({selectedList.length})
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
