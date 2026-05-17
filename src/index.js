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
      console.log(`Server listening on port ${server.address().port}`);
      resolve();
    });
    server.on('error', reject);
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
