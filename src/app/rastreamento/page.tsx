"use client";

import { useState } from "react";
import DeliveryMap from "../../components/logistics/DeliveryMap";
import styles from "./page.module.css";

export default function Rastreamento() {
  const [apiKey] = useState(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");

  if (!apiKey) {
    return (
      <main className={styles.main}>
        <div className={`glass-panel ${styles.hero}`}>
          <h1 className={styles.title}>API Key Missing</h1>
          <p className={styles.subtitle}>
            Please configure your NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to view the map.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.mapContainer}>
      <DeliveryMap apiKey={apiKey} />
    </main>
  );
}
