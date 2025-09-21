import dotenv from 'dotenv';
import app from './app';
import { getPool } from './models/database';
import { logger } from './utils/logger';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await getPool().query('SELECT NOW()');
    logger.info('✅ Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`🚀 MoA Account Manager AI server running on port ${PORT}`);
      logger.info(`📊 Dashboard will be available at http://localhost:${PORT}`);
      logger.info(`🔌 API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    try {
      await getPool().end();
    } finally {
      process.exit(1);
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...');
  try {
    await getPool().end();
  } finally {
    process.exit(0);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server...');
  try {
    await getPool().end();
  } finally {
    process.exit(0);
  }
});

startServer();
