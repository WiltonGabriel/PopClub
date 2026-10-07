import { PrismaClient, Prisma } from "@prisma/client";

type QueryArgs = Record<string, unknown>;

export interface DBAddonGroup {
  id: string;
  name: string;
  description?: string | null;
  minQuantity: number;
  maxQuantity: number;
  freeQuantity: number;
  isRequired: boolean;
  allowItemQuantity?: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBAddonItem {
  id: string;
  groupId: string;
  name: string;
  price: Prisma.Decimal | number;
  imageUrl?: string | null;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  group?: DBAddonGroup | null;
}

export interface DBCoupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: Prisma.Decimal | number;
  minOrderValue: Prisma.Decimal | number;
  maxUses: number | null;
  uses: number;
  expiresAt: Date | null;
  isActive: boolean;
  oncePerUser: boolean;
  productIds: string[];
  minLoyaltyLevel: number | null;
  loyaltyBadgeId: string | null;
  createdAt: Date;
}

export type AppPrismaClient = Omit<PrismaClient, "coupon" | "addonItem"> & {
  addonItem: {
    findMany: (args?: QueryArgs) => Promise<DBAddonItem[]>;
    findUnique: (args: QueryArgs) => Promise<DBAddonItem | null>;
    findFirst: (args?: QueryArgs) => Promise<DBAddonItem | null>;
    create: (args: QueryArgs) => Promise<DBAddonItem>;
    update: (args: QueryArgs) => Promise<DBAddonItem>;
    delete: (args: QueryArgs) => Promise<DBAddonItem>;
    count: (args?: QueryArgs) => Promise<number>;
  };
  coupon: {
    findMany: (args?: QueryArgs) => Promise<DBCoupon[]>;
    findUnique: (args: QueryArgs) => Promise<DBCoupon | null>;
    findFirst: (args?: QueryArgs) => Promise<DBCoupon | null>;
    create: (args: QueryArgs) => Promise<DBCoupon>;
    update: (args: QueryArgs) => Promise<DBCoupon>;
    delete: (args: QueryArgs) => Promise<DBCoupon>;
    count: (args?: QueryArgs) => Promise<number>;
  };
};

const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined;
};

const rawPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

export const prisma = rawPrisma as unknown as AppPrismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
