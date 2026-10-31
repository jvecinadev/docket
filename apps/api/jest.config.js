/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],

  // env.ts MUST be in setupFiles — it runs before any module import,
  // which means .env.test is loaded before PrismaClient is constructed.
  setupFiles: ['<rootDir>/test/env.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // Migrations run once per `jest` invocation, in the main process.
  globalSetup: '<rootDir>/test/global-setup.ts',
  // NO globalTeardown — the worker's Prisma client disconnects in setup.ts afterAll.

  moduleNameMapper: {
    '^@test/(.*)$': '<rootDir>/test/$1',
  },

  testPathIgnorePatterns: [
    '/node_modules/',
    '/helpers/',
    '/factories/',
    '/fixtures/',
    '/templates/',
  ],

  maxWorkers: 1,

  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/**/*.d.ts'],
};