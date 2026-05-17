const { startServer } = require('./src/index');

// Root entrypoint that starts the backend server.
startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
