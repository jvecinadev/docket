import { truncateAll, disconnect } from '@test/helpers/db';

beforeAll(async () => {
  // one-time: run migrations, start containers, etc.
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await disconnect();
});