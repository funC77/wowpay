import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@prisma/client';
import { getEnv } from './env';

let prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    const adapter = new PrismaD1(getEnv().DB);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}
