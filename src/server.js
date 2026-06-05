const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');
const redis = require('./config/redis');

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

async function shutdown() {
  console.log('Shutting down server');
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
