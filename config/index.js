const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
  env: process.env.NODE_ENV,
  port: process.env.PORT || 3000,
  socketIoPort: process.env.SOCKET_IO_PORT || 3001,
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password',
    database: process.env.POSTGRES_DB || 'messaging_platform',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  socketIo: {
    cors: {
      origin: process.env.SOCKET_IO_CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  },
  webRtc: {
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302'],
      },
    ],
  },
  fileUpload: {
    maxFileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'video/mp4'],
  },
  logging: {
    level: process.env.LOGGING_LEVEL || 'info',
  },
};

module.exports = config;