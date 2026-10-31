import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set — did .env.test load?');
}

process.env.NODE_ENV = 'test';