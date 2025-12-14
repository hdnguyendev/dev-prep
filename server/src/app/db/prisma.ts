import "dotenv/config";
import { PrismaClient } from '../../generated/prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

// Enable WebSocket for Cloudflare Workers
neonConfig.webSocketConstructor = WebSocket;

// Get connection string from environment
// In Workers, this comes from wrangler secrets
// In local dev, from .env file
const getConnectionString = () => {
  // @ts-ignore - globalThis.DATABASE_URL is set by Workers
  return globalThis.DATABASE_URL || process.env.DATABASE_URL;
};

let prisma: PrismaClient;

// Initialize Prisma with Neon adapter
const initPrisma = () => {
  if (!prisma) {
    const connectionString = getConnectionString();
    
    if (!connectionString) {
      console.error("[DB] DATABASE_URL not found in environment");
      throw new Error("DATABASE_URL is required");
    }
    
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    
    prisma = new PrismaClient({ 
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error'] : [],
    });
  }
  return prisma;
};

// Removed blocking testConnection() - causes Workers to hang
// Connection happens lazily on first query

export const testConnection = async () => {
  // Non-blocking test for local dev only
  if (process.env.NODE_ENV !== 'production') {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("[DB] Database connection OK");
    } catch (error) {
      console.error("[DB] Database connection failed:", error);
    }
  }
};

export const disconnect = async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error("[DB] Disconnect error:", error);
  }
};

export const getPrisma = () => {
  return initPrisma();
};

// Initialize on import for non-Workers environments
if (typeof process !== 'undefined' && process.env.DATABASE_URL) {
  initPrisma();
}

export default new Proxy({} as PrismaClient, {
  get(target, prop) {
    return initPrisma()[prop as keyof PrismaClient];
  }
});