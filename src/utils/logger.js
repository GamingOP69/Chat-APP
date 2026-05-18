const { createLogger, format, transports } = require('winston');
const config = require('../../config');

const logger = createLogger({
  level: config.logging?.level || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  defaultMeta: { service: 'chat-app' },
  transports: [new transports.Console()],
});

module.exports = logger;
