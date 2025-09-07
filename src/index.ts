import dotenv from 'dotenv';
import app from './app';
import { getPool } from './models/database';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await getPool().query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 MoA Account Manager AI server running on port ${PORT}`);
      console.log(`📊 Dashboard will be available at http://localhost:${PORT}`);
      console.log(`🔌 API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    try {
      await getPool().end();
    } finally {
      process.exit(1);
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  try {
    await getPool().end();
  } finally {
    process.exit(0);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  try {
    await getPool().end();
  } finally {
    process.exit(0);
  }
});

startServer();
