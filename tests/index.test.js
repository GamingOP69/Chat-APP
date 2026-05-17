const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const io = require('socket.io-client');
const { connect, client: redisClient } = require('../src/redis');
const { db } = require('../src/db');
const { app, server, startServer, stopServer } = require('../src/index');

let port;

describe('Application Tests', () => {
  beforeAll(async () => {
    await startServer(0);
    port = server.address().port;
  });

  afterAll(async () => {
    await stopServer();
    await db.end();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  describe('GET /', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
    });
  });

  describe('Socket.IO Connection', () => {
    it('should establish a connection', async () => {
      const client = io(`http://127.0.0.1:${port}`);
      await new Promise((resolve, reject) => {
        client.on('connect', () => {
          expect(client.connected).toBe(true);
          client.close();
          resolve();
        });
        client.on('connect_error', reject);
      });
    });
  });

  describe('WebRTC Signaling', () => {
    it('should exchange ICE candidates', async () => {
      const client1 = io(`http://127.0.0.1:${port}`);
      const client2 = io(`http://127.0.0.1:${port}`);

      client1.on('connect', () => {
        client1.emit('join', 'room1');
      });

      client2.on('connect', () => {
        client2.emit('join', 'room1');
      });

      client1.on('offer', (offer) => {
        client2.emit('offer', offer);
      });

      client2.on('answer', (answer) => {
        client1.emit('answer', answer);
      });

      await new Promise(resolve => setTimeout(resolve, 150));
      client1.close();
      client2.close();
    });
  });

  describe('File Uploads', () => {
    it('should upload a file', async () => {
      const response = await request(app).post('/api/upload').attach('file', './tests/test.png');
      expect(response.status).toBe(201);
    });
  });

  describe('Redis Connection', () => {
    it('should set and get a value', async () => {
      const client = await connect();
      await client.set('test', 'value');
      const value = await client.get('test');
      expect(value).toBe('value');
      await client.quit();
    });
  });

  describe('PostgreSQL Connection', () => {
    it('should create a user', async () => {
      const username = `test-${Date.now()}`;
      const user = await db.query('INSERT INTO users (username) VALUES ($1) RETURNING *', [username]);
      expect(user.rows[0].username).toBe(username);
    });
  });
});