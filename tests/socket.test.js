const io = require('socket.io')();
const { expect } = require('chai');
const sinon = require('sinon');
const { createServer } = require('http');
const { v4: uuidv4 } = require('uuid');
const { Room, Message, User } = require('../src/db/models');
const { getRedisClient } = require('../src/redis');
const { getSocketUser } = require('../src/socket');

describe('Socket.IO event handling', () => {
  let server;
  let httpServer;
  let socket;
  let redisClient;

  before(async () => {
    httpServer = createServer();
    server = io(httpServer);
    await new Promise(resolve => httpServer.listen(0, resolve));
    redisClient = getRedisClient();
  });

  after(async () => {
    await new Promise(resolve => httpServer.close(resolve));
    await redisClient.quit();
  });

  beforeEach(async () => {
    socket = {
      id: uuidv4(),
      emit: sinon.stub(),
      join: sinon.stub(),
      leave: sinon.stub(),
      on: sinon.stub(),
      off: sinon.stub(),
      disconnect: sinon.stub(),
    };
    sinon.stub(server, 'emit').returns(server);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('connection event', () => {
    it('should handle new connection', async () => {
      const userId = uuidv4();
      const roomId = uuidv4();
      socket.handshake.auth = { userId, roomId };
      server.emit.withArgs('connection', socket).yields();
      expect(socket.join).to.have.been.calledWith(roomId);
      expect(getSocketUser(socket.id)).to.equal(userId);
    });
  });

  describe('disconnect event', () => {
    it('should handle socket disconnection', async () => {
      socket.disconnect.returns(true);
      server.emit.withArgs('disconnect', socket).yields();
      expect(socket.leave).to.have.been.called;
    });
  });

  describe('message event', () => {
    it('should handle new message', async () => {
      const roomId = uuidv4();
      const message = { text: 'Hello, world!' };
      socket.on.withArgs('message', sinon.match.func).yields(roomId, message);
      expect(server.emit).to.have.been.calledWith('message', roomId, message);
    });
  });

  describe('typing event', () => {
    it('should handle typing status update', async () => {
      const roomId = uuidv4();
      const typing = true;
      socket.on.withArgs('typing', sinon.match.func).yields(roomId, typing);
      expect(redisClient.set).to.have.been.calledWith(`typing:${roomId}`, socket.id, 'EX', 10);
    });
  });

  describe('read event', () => {
    it('should handle read receipt', async () => {
      const roomId = uuidv4();
      const messageId = uuidv4();
      socket.on.withArgs('read', sinon.match.func).yields(roomId, messageId);
      expect(server.emit).to.have.been.calledWith('read', roomId, messageId);
    });
  });

  describe('call event', () => {
    it('should handle voice/video call', async () => {
      const roomId = uuidv4();
      const callType = 'voice';
      socket.on.withArgs('call', sinon.match.func).yields(roomId, callType);
      expect(server.emit).to.have.been.calledWith('call', roomId, callType);
    });
  });

  describe('ice event', () => {
    it('should handle ICE candidate exchange', async () => {
      const roomId = uuidv4();
      const candidate = { foo: 'bar' };
      socket.on.withArgs('ice', sinon.match.func).yields(roomId, candidate);
      expect(server.emit).to.have.been.calledWith('ice', roomId, candidate);
    });
  });

  describe('offer event', () => {
    it('should handle SDP offer', async () => {
      const roomId = uuidv4();
      const offer = { foo: 'bar' };
      socket.on.withArgs('offer', sinon.match.func).yields(roomId, offer);
      expect(server.emit).to.have.been.calledWith('offer', roomId, offer);
    });
  });

  describe('answer event', () => {
    it('should handle SDP answer', async () => {
      const roomId = uuidv4();
      const answer = { foo: 'bar' };
      socket.on.withArgs('answer', sinon.match.func).yields(roomId, answer);
      expect(server.emit).to.have.been.calledWith('answer', roomId, answer);
    });
  });
});