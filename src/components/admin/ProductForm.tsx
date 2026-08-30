"use client";

import { useState } from "react";
import styles from "./ProductForm.module.css";
import { productService, Product } from "../../services/productService";

interface ProductFormProps {
  onClose: () => void;
  onProductCreated: (product: Product) => void;
}

export default function ProductForm({ onClose, onProductCreated }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Açaí",
    imageUrl: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const newProduct = await productService.createProduct({
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category as Product["category"],
        imageUrl: formData.imageUrl,
      });

      onProductCreated(newProduct);
    } catch (err: any) {
      setError(err.message || "Erro ao criar o produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Novo Produto</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Nome do Produto</label>
            <input required type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Ex: Açaí Tradicional" />
          </div>

          <div className={styles.field}>
            <label>Descrição</label>
            <textarea required name="description" value={formData.description} onChange={handleChange} placeholder="Descrição atrativa..." rows={3} />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Preço (R$)</label>
              <input required type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} placeholder="0.00" />
            </div>

            <div className={styles.field}>
              <label>Categoria</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                <option value="Açaí">Açaí</option>
                <option value="Sorvetes">Sorvetes</option>
                <option value="Shakes">Shakes</option>
                <option value="Combos">Combos</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>URL da Imagem</label>
            <input required type="url" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://..." />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
