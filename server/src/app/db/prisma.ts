import "dotenv/config";
import { PrismaClient } from '../../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export const testConnection = async () => {
  try {
    console.log("[DB] Connecting to the database...");
    await prisma.$connect();
    console.log("[DB] Connected to the database");
  } catch (error) {
    console.error("[DB] Unable to connect to the database:", error);
    throw error;
  }
};

export const disconnect = async () => {
  try {
    console.log("[DB] Disconnecting from the database...");
    await prisma.$disconnect();
    console.log("[DB] Disconnected from the database");
  } catch (error) {
    console.error("[DB] Unable to disconnect from the database:", error);
    throw error;
  }
};

export const getPrisma = () => {
  return prisma;
};

export default prisma;