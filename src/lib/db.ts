import { PrismaClient } from "@prisma/client";

// Create a new Prisma client instance for each request to avoid prepared statement conflicts
export const prisma = new PrismaClient({
  log: ["error", "warn"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});


