import "dotenv/config";
import { PrismaClient } from "../../generated/prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// ⚠️ Using pg (PostgreSQL) with PrismaPg adapter for Hyperdrive compatibility
// Hyperdrive provides a connection string that works with standard pg driver

// ⚠️ CRITICAL: In Cloudflare Workers, DO NOT cache Prisma instances between requests
// Each request is isolated - I/O objects from one request cannot be used in another
// We create a new Prisma client for each request

// Get connection string from multiple sources
const getConnectionString = (): string | undefined => {
  // 1. Try globalThis (set by Workers middleware)
  // @ts-ignore
  if (globalThis.DATABASE_URL) return globalThis.DATABASE_URL;
  
  // 2. Try process.env (local dev)
  if (typeof process !== 'undefined' && process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  return undefined;
};

// Initialize Prisma with Neon adapter
const createPrismaClient = (connectionString: string, pool?: Pool): PrismaClient => {
  // Validate connection string (minimal logging for performance)
  if (!connectionString || typeof connectionString !== 'string' || connectionString.trim() === '') {
    throw new Error("[DB] ❌ Invalid connection string");
  }
  
  if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
    throw new Error(`[DB] ❌ Invalid connection string format`);
  }
  
  try {
    const dbUrl = connectionString.trim();
    const poolInstance =
      pool ||
      new Pool({
        connectionString: dbUrl,
        max: 5, // small pool for local/long-lived server
      });

    const adapter = new PrismaPg(poolInstance);

    const client = new PrismaClient({
      adapter,
      log: ['error'],
    });

    return client;
  } catch (error: any) {
    console.error("[DB] ❌ Fatal error creating Prisma client");
    console.error("[DB] Error type:", error?.constructor?.name);
    console.error("[DB] Error message:", error?.message);
    if (error?.stack) {
      console.error("[DB] Error stack (first 500 chars):", error.stack.substring(0, 500));
    }
    throw error;
  }
};

// Get or create Prisma instance
// Edge/Workers: new per request. Local/Node/Bun: reuse singleton.
const initPrisma = (): PrismaClient => {
  const connectionString = getConnectionString();
  
  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Check Wrangler secrets.");
  }

  const isEdgeRuntime =
    typeof EdgeRuntime !== "undefined" ||
    typeof WebSocketPair !== "undefined" ||
    process.env.CF_PAGES === "1" ||
    process.env.WORKERS === "1";

  if (isEdgeRuntime) {
    return createPrismaClient(connectionString);
  }

  const g = globalThis as unknown as {
    __PRISMA_SINGLETON__?: PrismaClient;
    __PRISMA_POOL__?: Pool;
  };

  if (!g.__PRISMA_SINGLETON__) {
    const pool =
      g.__PRISMA_POOL__ ||
      new Pool({
        connectionString: connectionString.trim(),
        max: 5,
      });
    g.__PRISMA_POOL__ = pool;
    g.__PRISMA_SINGLETON__ = createPrismaClient(connectionString, pool);
  }

  return g.__PRISMA_SINGLETON__!;
};

export const getPrisma = () => {
  return initPrisma();
};

// Don't initialize eagerly - let it happen on first use
// This allows Workers middleware to set env vars first
export default new Proxy({} as PrismaClient, {
  get(target, prop) {
    return initPrisma()[prop as keyof PrismaClient];
  }
});