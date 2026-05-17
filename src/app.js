const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const socketHandlers = require('./socketHandlers');
const db = require('./db');
const redis = require('./redis');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  },
});

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use('/api', routes);

app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

io.on('connection', (socket) => {
  socketHandlers(io, socket);
});

db.connect()
  .then(() => {
    console.log('Database connected');
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });

redis.connect()
  .then(() => {
    console.log('Redis connected');
  })
  .catch((err) => {
    console.error('Redis connection error:', err);
  });

server.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});