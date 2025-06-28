// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // This is the correct way to declare a global variable for this pattern.
  // We are telling ESLint to ignore the 'no-var' rule for this line only.
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    // log: ['query', 'info', 'warn', 'error'], // Uncomment for debugging
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;