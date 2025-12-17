import "dotenv/config";
import { PrismaClient } from '../../generated/prisma/client';
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
const createPrismaClient = (connectionString: string): PrismaClient => {
  // Validate connection string (minimal logging for performance)
  if (!connectionString || typeof connectionString !== 'string' || connectionString.trim() === '') {
    throw new Error("[DB] ❌ Invalid connection string");
  }
  
  if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
    throw new Error(`[DB] ❌ Invalid connection string format`);
  }
  
  try {
    // Create Pool with connectionString (from Hyperdrive or DATABASE_URL)
    const dbUrl = connectionString.trim();
    console.log("[DB] Creating Pool with connection string (length:", dbUrl.length, ")");
    
    const pool = new Pool({ 
      connectionString: dbUrl,
      max: 1, // Single connection for serverless
    });
    
    if (!pool) {
      throw new Error("[DB] ❌ Pool creation failed");
    }
    
    console.log("[DB] ✅ Pool created");
    
    // Create adapter and client (using PrismaPg for standard pg driver)
    const adapter = new PrismaPg(pool);
    console.log("[DB] ✅ Adapter created");
    
    const client = new PrismaClient({ 
      adapter,
      log: ['error'],
    });
    
    console.log("[DB] ✅ PrismaClient created");
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
// ⚠️ CRITICAL: In Workers, create NEW instance per request (no caching)
// This prevents "Cannot perform I/O on behalf of a different request" errors
const initPrisma = (): PrismaClient => {
  // Get connection string
  const connectionString = getConnectionString();
  
  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Check Wrangler secrets.");
  }
  
  // ⚠️ CRITICAL: Create NEW client for each request in Workers
  // Do NOT cache - Workers isolate requests and cached I/O objects fail
  return createPrismaClient(connectionString);
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