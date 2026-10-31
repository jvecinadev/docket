import { prisma } from '@docket/db';

const EXCLUDED_TABLES = ['_prisma_migrations'];

export async function truncateAll(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename != ALL(${EXCLUDED_TABLES})
  `;

  if (tables.length === 0) return;

  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`
  );
}