const io = require('socket.io')();
const { v4: uuidv4 } = require('uuid');
const { User, Room, Message } = require('./models');
const { redisClient } = require('./redis');
const { webRTC } = require('./webRTC');

const socketMap = new Map();
const roomMap = new Map();

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('joinRoom', async (roomId) => {
    const room = await Room.findById(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    socket.join(roomId);
    roomMap.set(roomId, room);

    const usersInRoom = await User.find({ rooms: { $in: [roomId] } });
    socket.emit('usersInRoom', usersInRoom);

    socket.broadcast.to(roomId).emit('newUserJoined', socket.id);
  });

  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    socket.broadcast.to(roomId).emit('userLeft', socket.id);
  });

  socket.on('sendMessage', async (message) => {
    const newMessage = new Message(message);
    await newMessage.save();

    const room = roomMap.get(message.roomId);
    if (room) {
      room.messages.push(newMessage._id);
      await room.save();
    }

    socket.broadcast.to(message.roomId).emit('newMessage', newMessage);
  });

  socket.on('typing', (roomId) => {
    socket.broadcast.to(roomId).emit('typing', socket.id);
  });

  socket.on('stopTyping', (roomId) => {
    socket.broadcast.to(roomId).emit('stopTyping', socket.id);
  });

  socket.on('call', (data) => {
    const { userId, roomId, callType } = data;
    socket.broadcast.to(roomId).emit('call', { userId, callType });
  });

  socket.on('answerCall', (data) => {
    const { userId, roomId, callType } = data;
    socket.broadcast.to(roomId).emit('answerCall', { userId, callType });
  });

  socket.on('hangUp', (roomId) => {
    socket.broadcast.to(roomId).emit('hangUp');
  });

  socket.on('fileUpload', (file) => {
    const fileId = uuidv4();
    socket.emit('fileUploadSuccess', { fileId, file });
    socket.broadcast.to(file.roomId).emit('newFile', { fileId, file });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    socketMap.delete(socket.id);
  });
});

module.exports = io;