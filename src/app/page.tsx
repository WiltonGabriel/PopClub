import Link from "next/link";
import { mockProducts } from "../data/mockProducts";
import styles from "./page.module.css";

export default function Storefront() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <span className={styles.brandName}>PopClub</span>
        </div>
        <div className={styles.searchBar}>
          <input type="text" placeholder="O que você deseja pedir hoje?" className={styles.searchInput} />
        </div>
        <div className={styles.headerActions}>
          <Link href="/rastreamento" className={styles.trackButton}>
            Rastrear Pedido
          </Link>
          <button className={styles.loginButton}>Entrar</button>
          <button className={styles.cartButton}>🛒 Carrinho</button>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Category Navigation */}
        <section className={styles.categories}>
          {["Todos", "Açaí", "Sorvetes", "Shakes", "Combos"].map((cat) => (
            <button key={cat} className={`${styles.categoryChip} ${cat === "Todos" ? styles.active : ""}`}>
              {cat}
            </button>
          ))}
        </section>

        {/* Product Grid */}
        <section className={styles.productGrid}>
          {mockProducts.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <div className={styles.imageWrapper}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.imageUrl} alt={product.name} className={styles.productImage} />
              </div>
              <div className={styles.productInfo}>
                <h3 className={styles.productName}>{product.name}</h3>
                <p className={styles.productDescription}>{product.description}</p>
                <div className={styles.productFooter}>
                  <span className={styles.productPrice}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                  </span>
                  <button className={styles.addButton}>+</button>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
