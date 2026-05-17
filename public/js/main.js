// Import required modules
import { io } from 'socket.io-client';
import { createRoom, joinRoom, leaveRoom, sendMessage, typing, stopTyping } from './socketEvents.js';
import { VoiceCall, VideoCall } from './webrtc.js';
import { uploadFile, previewFile } from './upload.js';
import { getOnlineUsers, getRoomMessages } from './api.js';

// Define constants
const socket = io();
const roomId = window.location.pathname.split('/')[1];
const userId = Math.random().toString(36).substr(2, 10);

// Define UI elements
const chatPanel = document.getElementById('chat-panel');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const typingIndicator = document.getElementById('typing-indicator');
const onlineUsersList = document.getElementById('online-users-list');
const roomMessagesList = document.getElementById('room-messages-list');
const voiceCallButton = document.getElementById('voice-call-button');
const videoCallButton = document.getElementById('video-call-button');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');

// Initialize WebRTC
const voiceCall = new VoiceCall();
const videoCall = new VideoCall();

// Initialize socket events
socket.on('connect', () => {
  console.log('Connected to the server');
  joinRoom(roomId, userId);
});

socket.on('disconnect', () => {
  console.log('Disconnected from the server');
  leaveRoom(roomId, userId);
});

socket.on('newMessage', (message) => {
  renderMessage(message);
});

socket.on('typing', (userId) => {
  typingIndicator.textContent = `Typing... ${userId}`;
});

socket.on('stopTyping', () => {
  typingIndicator.textContent = '';
});

socket.on('onlineUsers', (users) => {
  renderOnlineUsers(users);
});

socket.on('roomMessages', (messages) => {
  renderRoomMessages(messages);
});

// Define event listeners
sendButton.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if (message) {
    sendMessage(roomId, userId, message);
    messageInput.value = '';
  }
});

messageInput.addEventListener('input', () => {
  typing();
  setTimeout(stopTyping, 2000);
});

voiceCallButton.addEventListener('click', () => {
  voiceCall.initiateCall(roomId, userId);
});

videoCallButton.addEventListener('click', () => {
  videoCall.initiateCall(roomId, userId);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  uploadFile(file);
});

// Define rendering functions
function renderMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.textContent = `${message.userId}: ${message.text}`;
  roomMessagesList.appendChild(messageElement);
}

function renderOnlineUsers(users) {
  onlineUsersList.innerHTML = '';
  users.forEach((user) => {
    const userElement = document.createElement('div');
    userElement.textContent = user;
    onlineUsersList.appendChild(userElement);
  });
}

function renderRoomMessages(messages) {
  roomMessagesList.innerHTML = '';
  messages.forEach((message) => {
    renderMessage(message);
  });
}

// Initialize
getOnlineUsers(roomId).then((users) => {
  renderOnlineUsers(users);
});

getRoomMessages(roomId).then((messages) => {
  renderRoomMessages(messages);
});