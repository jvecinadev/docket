import { execSync } from 'child_process';

export default async function globalSetup() {
  execSync('pnpm --filter @docket/db migrate:test', {
    stdio: 'inherit',
    env: process.env,
  });
}