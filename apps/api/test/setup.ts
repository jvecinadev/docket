import { prisma } from '@docket/db';
import { truncateAll } from '@test/helpers/db';

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await prisma.$disconnect();
});