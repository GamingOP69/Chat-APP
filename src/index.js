const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('../config');
const db = require('./db');
const redisClient = require('./redis');
const { initSocketHandlers } = require('./socket');

const server = http.createServer(app);
const io = new Server(server, { cors: config.socketIo.cors });
let serverStarted = false;
// Optionally wire Redis adapter for multi-node scaling
if (config.socketIo.adapter === 'redis') {
  try {
    const { createClient } = require('redis');
    const { createAdapter } = require('@socket.io/redis-adapter');
    const pubClient = createClient({ url: config.redis.password
      ? `redis://:${config.redis.password}@${config.redis.host}:${config.redis.port}`
      : `redis://${config.redis.host}:${config.redis.port}`
    });
    const subClient = pubClient.duplicate();
    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.IO Redis adapter connected');
    }).catch((err) => {
      console.error('Failed to connect Redis adapter:', err);
    });
  } catch (err) {
    console.warn('Redis adapter not available:', err.message);
  }
}

async function startServer(port = config.port) {
  if (serverStarted) {
    return server;
  }

  await db.connect();
  await db.initializeSchema();
  await redisClient.connect();
  initSocketHandlers(io);

  await new Promise((resolve, reject) => {
    server.listen(port, () => {
      serverStarted = true;
      const actual = server.address().port;
      const logger = require('./utils/logger');
      logger.info('Server listening on port %d', actual);
      resolve();
    });
    server.on('error', (err) => reject(err));
  });

  return server;
}

async function stopServer() {
  if (!serverStarted || !server.listening) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) return reject(error);
      serverStarted = false;
      resolve();
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
  });
}

module.exports = { app, server, io, startServer, stopServer };
