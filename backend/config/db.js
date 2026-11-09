import pkg from '@prisma/client';
import logger from '../utils/logger.js';
const { PrismaClient } = pkg;

// Configure Prisma with connection retry and logging
const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  errorFormat: 'pretty',
});

// Connection retry logic with exponential backoff
const MAX_RETRIES = 5;
const INITIAL_DELAY = 1000; // 1 second

async function connectWithRetry(retries = MAX_RETRIES, delay = INITIAL_DELAY) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await basePrisma.$connect();
      // logger.debug('[DB] Connected to database successfully');
      return true;
    } catch (error) {
      // logger.error(`[DB] Connection attempt ${attempt}/${retries} failed:`, error.message);
      
      if (attempt === retries) {
        // logger.error('[DB] All connection attempts failed. Possible causes:');
        // logger.error('  1. Database server is down or paused (check Aiven console)');
        // logger.error('  2. Network/firewall blocking port 26899');
        // logger.error('  3. Invalid credentials in DATABASE_URL');
        // logger.error('  4. SSL certificate issues');
        throw error;
      }
      
      const nextDelay = delay * Math.pow(2, attempt - 1); // Exponential backoff
      // logger.debug(`[DB] Retrying in ${nextDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, nextDelay));
    }
  }
}

// Retry queries on connection errors. Uses a client extension because
// prisma.$use() middleware was removed in Prisma 6.14+.
const RETRYABLE_ERRORS = ['P1001', 'P1002', 'P1008', 'P1017'];
const MAX_QUERY_RETRIES = 3;

const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ args, query }) {
      let lastError;
      for (let attempt = 1; attempt <= MAX_QUERY_RETRIES; attempt++) {
        try {
          return await query(args);
        } catch (error) {
          lastError = error;
          if (!(error.code && RETRYABLE_ERRORS.includes(error.code)) || attempt === MAX_QUERY_RETRIES) {
            throw error;
          }
          logger.warn(`[DB] Query failed with ${error.code}, retry ${attempt}/${MAX_QUERY_RETRIES}`);
          try {
            await basePrisma.$disconnect();
            await basePrisma.$connect();
          } catch (reconnectError) {
            logger.error('[DB] Reconnection failed:', reconnectError.message);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      throw lastError;
    },
  },
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await basePrisma.$disconnect();
});

export { connectWithRetry };
export default prisma;
