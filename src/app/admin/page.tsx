"use client";

import { useEffect, useState } from "react";
import { productService, Product } from "../../services/productService";
import ProductForm from "../../components/admin/ProductForm";
import styles from "./page.module.css";

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getProducts();
      setProducts(data);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao carregar produtos. Verifique as credenciais ou as RLS Policies.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar este produto?")) {
      try {
        await productService.deleteProduct(id);
        setProducts(products.filter((p) => p.id !== id));
      } catch (err: any) {
        alert("Erro ao deletar produto: " + err.message);
      }
    }
  };

  const handleProductCreated = (newProduct: Product) => {
    setProducts([newProduct, ...products]);
    setIsFormOpen(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin: Catálogo</h1>
        <button className={styles.addButton} onClick={() => setIsFormOpen(true)}>
          + Novo Produto
        </button>
      </header>

      {isFormOpen && (
        <ProductForm 
          onClose={() => setIsFormOpen(false)} 
          onProductCreated={handleProductCreated} 
        />
      )}

      {error ? (
        <div style={{ color: "#ff4b4b", padding: "20px" }}>{error}</div>
      ) : loading ? (
        <div className={styles.loading}>Carregando dados do Supabase...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Imagem</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.imageUrl} alt={product.name} className={styles.productImage} />
                  </td>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.editBtn}>Editar</button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(product.id)}>Deletar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "gray" }}>
                    Nenhum produto cadastrado no banco de dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
