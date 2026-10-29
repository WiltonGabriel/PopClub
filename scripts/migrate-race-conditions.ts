import { prisma } from '../src/lib/prisma';

async function runMigration() {
  console.log("Iniciando migração de banco para prevenção de Race Conditions...");

  // 1. Idempotência em Orders
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(255);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "unique_orders_idempotency_key" 
    ON "orders"("idempotency_key") 
    WHERE "idempotency_key" IS NOT NULL;
  `);
  console.log("✔ 1. Idempotency key e índice único em 'orders' criados.");

  // 2. Unicidade de Telefone
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "unique_users_phone" 
    ON "users"("phone") 
    WHERE "phone" IS NOT NULL AND "phone" != '';
  `);
  console.log("✔ 2. Índice único parcial em 'users(phone)' criado.");

  // 3. Unicidade de Turno Aberto
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_shift" 
    ON "shifts"("is_open") 
    WHERE "is_open" = true;
  `);
  console.log("✔ 3. Índice único parcial 'unique_active_shift' criado.");

  // 4. Tabela coupon_redemptions
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
      "id" VARCHAR(36) PRIMARY KEY,
      "coupon_id" VARCHAR(36) NOT NULL REFERENCES "coupons"("id") ON DELETE CASCADE,
      "user_id" VARCHAR(36) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "order_id" VARCHAR(36) REFERENCES "orders"("id") ON DELETE SET NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "unique_user_coupon_redemption" UNIQUE ("coupon_id", "user_id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_coupon_redemptions_lookup" 
    ON "coupon_redemptions"("coupon_id", "user_id");
  `);
  console.log("✔ 4. Tabela 'coupon_redemptions' e constraint única criadas.");

  console.log("Migração concluída com 100% de sucesso!");
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Falha na migração:", err);
    process.exit(1);
  });
