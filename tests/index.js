const { describe, it, expect } = require('@jest/globals');
const request = require('supertest');
const app = require('../src/app');
const io = require('socket.io-client');
const { connect } = require('../src/redis');
const { db } = require('../src/db');

describe('Application Tests', () => {
  beforeAll(async () => {
    await db.connect();
    await connect();
  });

  afterAll(async () => {
    await db.end();
    await connect().then(client => client.quit());
  });

  describe('GET /', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
    });
  });

  describe('Socket.IO Connection', () => {
    it('should establish a connection', async () => {
      const client = io('http://localhost:3000');
      client.on('connect', () => {
        expect(client.connected).toBe(true);
      });
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('WebRTC Signaling', () => {
    it('should exchange ICE candidates', async () => {
      const client1 = io('http://localhost:3000');
      const client2 = io('http://localhost:3000');

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

      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('File Uploads', () => {
    it('should upload a file', async () => {
      const response = await request(app).post('/upload').attach('file', './test.txt');
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
      const user = await db.query('INSERT INTO users (id, username) VALUES ($1, $2) RETURNING *', [1, 'test']);
      expect(user.rows[0].username).toBe('test');
    });
  });
});