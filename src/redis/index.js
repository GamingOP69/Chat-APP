const { createClient } = require('redis');
const config = require('../../config');

const client = createClient({
  url: config.redis.password
    ? `redis://:${config.redis.password}@${config.redis.host}:${config.redis.port}`
    : `redis://${config.redis.host}:${config.redis.port}`,
});

client.on('error', (err) => {
  console.error('Redis error:', err);
});

async function connect() {
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}

function presenceKey(roomId) {
  return `room:presence:${roomId}`;
}

function typingKey(roomId) {
  return `room:typing:${roomId}`;
}

function socketUserKey(socketId) {
  return `socket:user:${socketId}`;
}

async function addRoomSocket(roomId, socketId) {
  await client.sAdd(presenceKey(roomId), socketId);
  await client.expire(presenceKey(roomId), 60 * 60);
}

async function removeRoomSocket(roomId, socketId) {
  await client.sRem(presenceKey(roomId), socketId);
}

async function getRoomSockets(roomId) {
  return client.sMembers(presenceKey(roomId));
}

async function setSocketUser(socketId, user) {
  await client.set(socketUserKey(socketId), JSON.stringify(user), { EX: 60 * 60 });
}

async function getSocketUser(socketId) {
  const value = await client.get(socketUserKey(socketId));
  return value ? JSON.parse(value) : null;
}

async function clearSocketUser(socketId) {
  await client.del(socketUserKey(socketId));
}

async function addTyping(socketId, roomId) {
  await client.sAdd(typingKey(roomId), socketId);
  await client.expire(typingKey(roomId), 20);
}

async function removeTyping(socketId, roomId) {
  await client.sRem(typingKey(roomId), socketId);
}

async function getTypingSockets(roomId) {
  return client.sMembers(typingKey(roomId));
}

module.exports = {
  client,
  connect,
  addRoomSocket,
  removeRoomSocket,
  getRoomSockets,
  setSocketUser,
  getSocketUser,
  clearSocketUser,
  addTyping,
  removeTyping,
  getTypingSockets,
};
