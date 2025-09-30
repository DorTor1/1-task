import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('prisma client', () => {
  it('connects and queries', async () => {
    const prisma = new PrismaClient();
    const count = await prisma.user.count();
    expect(typeof count).toBe('number');
    await prisma.$disconnect();
  });
});


