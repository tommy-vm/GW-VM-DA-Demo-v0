import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function safeQuery<T>(
  query: ReturnType<typeof Prisma.sql>,
  fallback: T
): Promise<T> {
  try {
    return (await prisma.$queryRaw(query)) as T;
  } catch (error) {
    console.warn("DB query failed", error);
    return fallback;
  }
}

export async function safeQueryUnsafe<T>(
  query: string,
  params: unknown[],
  fallback: T
): Promise<T> {
  try {
    return (await prisma.$queryRawUnsafe(query, ...params)) as T;
  } catch (error) {
    console.warn("DB query failed", error);
    return fallback;
  }
}
