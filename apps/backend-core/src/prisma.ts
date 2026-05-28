import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

let prisma: PrismaClient | null = null;

/**
 * Parses MySQL connection URL into parameters required by PrismaMariaDb adapter.
 */
function getAdapterOptions() {
  const urlString = process.env.DATABASE_URL;
  if (!urlString) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }

  try {
    const dbUrl = new URL(urlString);
    const host = dbUrl.hostname || 'localhost';
    const port = dbUrl.port ? parseInt(dbUrl.port, 10) : 3306;
    const user = dbUrl.username || 'root';
    const password = dbUrl.password ? decodeURIComponent(dbUrl.password) : '';
    const database = dbUrl.pathname ? decodeURIComponent(dbUrl.pathname.slice(1)) : 'hitsbot';

    return {
      host,
      port,
      user,
      password,
      database,
      connectionLimit: 10,
    };
  } catch (err: any) {
    throw new Error(`Failed to parse DATABASE_URL: ${err.message}`);
  }
}

/**
 * Returns the global, lazily-initialized PrismaClient instance.
 * Deferring initialization ensures process.env.DATABASE_URL is fully loaded
 * by dotenv before the client connects.
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    const options = getAdapterOptions();
    const adapter = new PrismaMariaDb(options);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

/**
 * Gracefully disconnects the global PrismaClient instance.
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.log('[Prisma] Global client disconnected.');
  }
}
