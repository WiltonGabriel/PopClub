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
      <DialogContent className="max-w-[900px] w-full p-0 overflow-hidden bg-background border-border border-2 grid grid-cols-1 md:grid-cols-2 gap-0 rounded-none shadow-[12px_12px_0px_0px_rgba(5,217,232,0.3)]">
        {/* Left Side: Live Preview */}
        <div className="relative p-8 bg-card flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,42,109,0.05)_50%,transparent_75%)] bg-[length:20px_20px] pointer-events-none" />
          <h2 className="absolute top-4 left-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Live Preview</h2>
          <div className="relative w-full max-w-[280px] aspect-[3/4] bg-background border-2 border-border flex flex-col group overflow-hidden shadow-2xl transition-transform duration-300 hover:scale-[1.02]">
            {/* Holographic foil overlay */}
            <div className="absolute inset-0 holo-foil opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10" />
            
            <div className="flex-1 bg-muted flex items-center justify-center relative overflow-hidden">
              {file ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(file)} alt="Preview" className="object-cover w-full h-full absolute inset-0 z-0" />
              ) : (
                <span className="text-muted-foreground font-mono text-sm tracking-widest z-0">NO_IMAGE</span>
              )}
            </div>
            
            <div className="p-4 border-t-2 border-border bg-background z-20 relative">
              <h3 className="font-heading text-xl text-foreground font-bold leading-tight truncate">{name || "ITEM_NAME"}</h3>
              <p className="font-sans text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[32px]">{description || "Enter item description..."}</p>
              <div className="mt-4 flex justify-between items-end border-t border-border/50 pt-2">
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">Value</span>
                  <span className="font-mono text-primary font-bold">${price || "0.00"}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">Class</span>
                  <span className="font-mono text-xs text-secondary">{categories.find(c => c.id === categoryId)?.name || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 flex flex-col justify-center bg-background">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-heading text-3xl text-foreground tracking-tighter uppercase">
              {productToEdit ? "Edit Profile" : "New Entry"}
              <span className="block text-primary text-sm font-mono tracking-widest mt-1">Sys.Catalog_Update</span>
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Designation</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="font-sans bg-background border-2 border-border focus-visible:border-secondary focus-visible:ring-0 rounded-none h-11 transition-colors" placeholder="e.g. Neon Samurai Figurine" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required className="font-sans bg-background border-2 border-border focus-visible:border-secondary focus-visible:ring-0 rounded-none h-11 transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="price" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Value (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-primary font-bold">$</span>
                  <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="font-mono bg-background border-2 border-border focus-visible:border-secondary focus-visible:ring-0 rounded-none h-11 pl-7" placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Classification</Label>
                <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "")} required>
                  <SelectTrigger className="font-sans bg-background border-2 border-border focus:border-secondary focus:ring-0 rounded-none h-11 shadow-none">
                    <SelectValue placeholder="Select class..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2 border-border bg-background">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="font-sans">{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="image" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Visual Asset</Label>
              <div className="flex border-2 border-border bg-background focus-within:border-secondary transition-colors h-11 relative overflow-hidden group">
                <div className="bg-muted px-4 flex items-center justify-center font-mono text-xs uppercase tracking-wider text-muted-foreground border-r-2 border-border group-hover:bg-muted/80 transition-colors">
                  Browse
                </div>
                <Input id="image" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" required={!productToEdit} />
                <div className="flex-1 px-3 flex items-center font-mono text-xs text-foreground truncate">
                  {file ? file.name : "No file selected"}
                </div>
              </div>
            </div>

            {error && <p className="text-primary font-mono text-[11px] uppercase bg-primary/10 p-2 border border-primary/20">{error}</p>}

            <Button type="submit" className="w-full h-12 rounded-none bg-primary hover:bg-primary/90 text-primary-foreground font-heading text-lg tracking-widest uppercase transition-colors border-2 border-transparent focus-visible:border-foreground mt-4 relative overflow-hidden group" disabled={loading}>
              <span className="relative z-10">{loading ? "Processing..." : "Commit Entry"}</span>
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
