"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, Loader2, Check, Trash2, Users } from "lucide-react";
import { useToast } from "../ui/ToastNotification";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface UserStat {
  id: string;
  name: string;
  phone: string | null;
  totalOrders: number;
  lastOrderAt: string | null;
}

interface CustomList {
  id: string;
  name: string;
  userIds: string[];
}

interface CustomAudienceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectionSaved: (userIds: string[]) => void;
}

export const CUSTOM_AUDIENCE_DIALOG_CONTENT_CLASS =
  "w-[calc(100vw-1.5rem)] max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-hidden overflow-x-hidden flex flex-col p-0 gap-0";

export function CustomAudienceModal({
  open,
  onOpenChange,
  onSelectionSaved,
}: CustomAudienceModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState<UserStat[]>([]);
  const [lists, setLists] = useState<CustomList[]>([]);
  
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Novo nome de lista
  const [newListName, setNewListName] = useState("");
  const [listIdToDelete, setListIdToDelete] = useState<string | null>(null);
  const [deletingList, setDeletingList] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audience");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);
      setLists(data.lists || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      showToast("Erro ao carregar clientes: " + message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  const filteredUsers = useMemo(() => {
    const s = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(s) ||
        (u.phone && u.phone.includes(s))
    );
  }, [search, users]);

  const toggleUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedUserIds(next);
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedUserIds);
    filteredUsers.forEach((u) => next.add(u.id));
    setSelectedUserIds(next);
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  const loadList = (list: CustomList) => {
    setSelectedUserIds(new Set(list.userIds));
    showToast(`Lista "${list.name}" carregada.`, "success");
  };

  const deleteList = (id: string) => {
    setListIdToDelete(id);
  };

  const executeDeleteList = async () => {
    if (!listIdToDelete) return;
    setDeletingList(true);
    try {
      const res = await fetch(`/api/audience/${listIdToDelete}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir lista.");
      setLists((prev) => prev.filter((l) => l.id !== listIdToDelete));
      showToast("Lista removida.", "info");
      setListIdToDelete(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      showToast(message, "error");
    } finally {
      setDeletingList(false);
    }
  };

  const handleSaveNewList = async () => {
    if (!newListName.trim()) {
      showToast("Digite um nome para a lista.", "error");
      return;
    }
    if (selectedUserIds.size === 0) {
      showToast("Selecione ao menos um cliente.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newListName.trim(),
          userIds: Array.from(selectedUserIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setLists([data, ...lists]);
      setNewListName("");
      showToast("Lista salva com sucesso!", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmSelection = () => {
    if (selectedUserIds.size === 0) {
      showToast("Selecione ao menos um cliente.", "error");
      return;
    }
    onSelectionSaved(Array.from(selectedUserIds));
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={CUSTOM_AUDIENCE_DIALOG_CONTENT_CLASS}>
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="w-5 h-5 text-primary" /> Público Personalizado
          </DialogTitle>
          <DialogDescription>
            Selecione manualmente os clientes ou carregue listas salvas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-zinc-950 flex flex-col gap-6">
          {/* Top section: Saved Lists */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" /> Listas Salvas ({lists.length}/6)
            </h4>
            {lists.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma lista salva ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {lists.map((l) => (
                  <div key={l.id} className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg pr-1">
                    <button
                      type="button"
                      onClick={() => loadList(l)}
                      className="px-3 py-1.5 text-xs font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors rounded-l-lg"
                    >
                      {l.name} ({l.userIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteList(l.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t mt-2">
              <Input
                placeholder="Nome para salvar nova lista..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="h-8 text-xs max-w-[250px]"
                maxLength={30}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveNewList}
                disabled={saving || lists.length >= 6}
                className="h-8 text-xs bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 dark:bg-primary/90/20 dark:text-primary/30 dark:border-primary/80/30"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar Atual"}
              </Button>
            </div>
          </div>

          {/* Client Selection */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border flex-1 flex flex-col min-h-[300px]">
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar cliente por nome..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={selectAllFiltered} className="h-9">
                    Selecionar Visíveis
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection} className="h-9 text-red-500 hover:text-red-600">
                    Limpar
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>Mostrando {filteredUsers.length} clientes ordenados de A-Z.</span>
                <strong className="text-primary">{selectedUserIds.size} selecionados</strong>
              </div>
            </div>

            <div className="flex-1 overflow-auto w-full min-w-0 overscroll-contain-x p-0">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-zinc-950/50 sticky top-0 z-10 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 w-[40px]">#</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Telefone</th>
                      <th className="px-4 py-3 text-center">Pedidos</th>
                      <th className="px-4 py-3 text-right">Último Pedido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedUserIds.has(user.id);
                      return (
                        <tr
                          key={user.id}
                          onClick={() => toggleUser(user.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/5/50 dark:bg-primary/90/10" : "hover:bg-gray-50 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by row click
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium">{user.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{user.phone || "-"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-medium">
                              {user.totalOrders}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                            {user.lastOrderAt ? new Date(user.lastOrderAt).toLocaleDateString("pt-BR") : "Sem pedidos"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-3 bg-white dark:bg-zinc-950">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmSelection} className="bg-primary hover:bg-[#7a05ac] text-white">
            Confirmar {selectedUserIds.size > 0 && `(${selectedUserIds.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={!!listIdToDelete}
      onOpenChange={(open) => {
        if (!open && !deletingList) setListIdToDelete(null);
      }}
      title="Excluir Lista Personalizada"
      description="Deseja realmente excluir esta lista personalizada de clientes?"
      confirmLabel="Excluir Lista"
      variant="danger"
      loading={deletingList}
      onConfirm={executeDeleteList}
    />
  </>
  );
}
