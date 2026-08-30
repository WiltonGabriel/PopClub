"use client";

import { useState } from "react";
import { productService, Product } from "../../services/productService";
import { Category } from "../../services/categoryService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (product: Product) => void;
  productToEdit?: Product | null;
  categories: Category[];
}

export function ProductFormDialog({ open, onOpenChange, onSaved, productToEdit, categories }: ProductFormDialogProps) {
  const [name, setName] = useState(productToEdit?.name || "");
  const [description, setDescription] = useState(productToEdit?.description || "");
  const [price, setPrice] = useState(productToEdit?.price?.toString() || "");
  const [categoryId, setCategoryId] = useState(productToEdit?.category_id || "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let result;
      const numPrice = parseFloat(price);

      if (productToEdit) {
        result = await productService.updateProduct(
          productToEdit.id,
          { name, description, price: numPrice, category_id: categoryId },
          file || undefined
        );
      } else {
        result = await productService.createProduct(
          { name, description, price: numPrice, category_id: categoryId, imageUrl: "" },
          file || undefined
        );
      }
      onSaved(result);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card text-white border-white/10">
        <DialogHeader>
          <DialogTitle>{productToEdit ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Produto</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-background border-white/20" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required className="bg-background border-white/20" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço</Label>
              <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="bg-background border-white/20" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "")} required>
                <SelectTrigger className="bg-background border-white/20">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Imagem do Produto</Label>
            <Input id="image" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="bg-background border-white/20 text-muted-foreground" required={!productToEdit} />
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
