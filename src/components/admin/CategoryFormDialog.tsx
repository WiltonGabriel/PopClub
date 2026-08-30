"use client";

import { useState } from "react";
import { categoryService, Category } from "../../services/categoryService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (category: Category) => void;
  categoryToEdit?: Category | null;
}

export function CategoryFormDialog({ open, onOpenChange, onSaved, categoryToEdit }: CategoryFormDialogProps) {
  const [name, setName] = useState(categoryToEdit?.name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let result;
      if (categoryToEdit) {
        result = await categoryService.updateCategory(categoryToEdit.id, { name });
      } else {
        result = await categoryService.createCategory(name);
      }
      onSaved(result);
      onOpenChange(false);
      setName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-white border-white/10">
        <DialogHeader>
          <DialogTitle>{categoryToEdit ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background border-white/20"
              required
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
