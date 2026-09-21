import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";
export * from "./seed-data.js";
export const prisma = new PrismaClient();
export const DB_VERSION = "1.0.0";

