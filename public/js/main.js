const socket = io();
const localId = localStorage.getItem('chatClientId') || `guest-${Math.random().toString(36).slice(2, 10)}`;
const username = localStorage.getItem('chatUsername') || `Guest-${Math.random().toString(36).slice(2, 6)}`;
localStorage.setItem('chatClientId', localId);
localStorage.setItem('chatUsername', username);

const elements = {
  roomList: document.getElementById('room-list'),
  currentRoomName: document.getElementById('current-room-name'),
  presenceText: document.getElementById('presence-text'),
  messageList: document.getElementById('message-list'),
  typingIndicator: document.getElementById('typing-indicator'),
  messageInput: document.getElementById('message-input'),
  sendButton: document.getElementById('send-button'),
  createRoomButton: document.getElementById('create-room-button'),
  roomModal: document.getElementById('room-modal'),
  roomNameInput: document.getElementById('room-name-input'),
  confirmRoomButton: document.getElementById('confirm-room-button'),
  cancelRoomButton: document.getElementById('cancel-room-button'),
  fileInput: document.getElementById('file-input'),
  toast: document.getElementById('toast'),
  startVideoButton: document.getElementById('start-video-button'),
  startAudioButton: document.getElementById('start-audio-button'),
  callOverlay: document.getElementById('call-overlay'),
  endCallButton: document.getElementById('end-call-button'),
  localVideo: document.getElementById('local-video'),
  remoteVideo: document.getElementById('remote-video'),
};

let currentRoomId = null;
let currentRoomName = null;
let typingTimeout = null;
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let activeCallerSocketId = null;

const stunServers = [{ urls: ['stun:stun.l.google.com:19302'] }];

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  window.setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 2800);
}

function createRoomItem(room) {
  const button = document.createElement('button');
  button.textContent = room.name;
  button.dataset.id = room.id;
  button.addEventListener('click', () => joinRoom(room.id, room.name));
  return button;
}

async function loadRooms() {
  try {
    const response = await fetch('/api/rooms');
    const data = await response.json();
    elements.roomList.innerHTML = '';
    data.rooms.forEach((room) => {
      elements.roomList.appendChild(createRoomItem(room));
    });
  } catch (error) {
    showToast('Unable to load rooms');
    console.error(error);
  }
}

function clearMessages() {
  elements.messageList.innerHTML = '';
}

function appendMessage(message) {
  const card = document.createElement('article');
  card.className = 'message-card';

  const author = document.createElement('p');
  author.className = 'message-author';
  author.textContent = `${message.username} • ${new Date(message.createdAt).toLocaleTimeString()}`;

  const content = document.createElement('p');
  content.className = 'message-text';
  content.innerHTML = message.type === 'file'
    ? `📎 File uploaded: <a href="${message.attachmentUrl}" target="_blank" rel="noreferrer">${message.attachmentName || 'Download'}</a>`
    : message.content;

  card.appendChild(author);
  card.appendChild(content);
  elements.messageList.appendChild(card);
  elements.messageList.scrollTop = elements.messageList.scrollHeight;
}

function renderPresence(members) {
  if (!members || members.length === 0) {
    elements.presenceText.textContent = 'Waiting for participants';
    return;
  }
  const names = members
    .map((member) => member.username)
    .slice(0, 4)
    .join(', ');
  elements.presenceText.textContent = `${members.length} participant(s) online: ${names}`;
}

function renderTyping(data) {
  if (data && data.typingMembers && data.typingMembers.length) {
    const names = data.typingMembers.map((item) => item.username).join(', ');
    elements.typingIndicator.textContent = `${names} typing...`;
  } else {
    elements.typingIndicator.textContent = '';
  }
}

function setActiveRoom(roomId, roomName) {
  currentRoomId = roomId;
  currentRoomName = roomName;
  elements.currentRoomName.textContent = roomName;
  Array.from(elements.roomList.children).forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.id) === roomId);
  });
}

function setRoomState(roomId, roomName) {
  setActiveRoom(roomId, roomName);
  clearMessages();
  showToast(`Joined room: ${roomName}`);
}

async function joinRoom(roomId, roomName) {
  if (!roomId) return;
  setRoomState(roomId, roomName);
  socket.emit('room:join', { roomId, username: username }, (result) => {
    if (!result.success) {
      showToast(result.message || 'Unable to join room');
      return;
    }
    elements.messageList.innerHTML = '';
    result.messages.forEach(appendMessage);
    renderPresence(result.members);
  });
}

function sendMessage() {
  const message = elements.messageInput.value.trim();
  if (!message || !currentRoomId) {
    return;
  }
  socket.emit('message:create', { roomId: currentRoomId, content: message, messageType: 'text' }, (result) => {
    if (!result.success) {
      showToast(result.message || 'Send failed');
      return;
    }
    elements.messageInput.value = '';
  });
}

function broadcastTyping() {
  if (!currentRoomId) {
    return;
  }
  socket.emit('typing:start', { roomId: currentRoomId });
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { roomId: currentRoomId });
  }, 1200);
}

function showCallPanel() {
  elements.callOverlay.classList.remove('hidden');
}

function hideCallPanel() {
  elements.callOverlay.classList.add('hidden');
  if (remoteStream) {
    const tracks = remoteStream.getTracks();
    tracks.forEach((track) => track.stop());
  }
  if (localStream) {
    const tracks = localStream.getTracks();
    tracks.forEach((track) => track.stop());
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteStream = null;
  localStream = null;
}

function createPeerConnection(targetSocketId) {
  peerConnection = new RTCPeerConnection({ iceServers: stunServers });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc:signal', {
        targetSocketId,
        signal: { type: 'ice', candidate: event.candidate },
      });
    }
  };

  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0];
    elements.remoteVideo.srcObject = remoteStream;
  };

  if (localStream) {
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
  }

  return peerConnection;
}

async function initLocalMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    elements.localVideo.srcObject = localStream;
  } catch (error) {
    showToast('Unable to access camera or microphone');
    console.error(error);
  }
}

async function initiateCall(callType) {
  if (!currentRoomId) {
    showToast('Join a room first');
    return;
  }
  socket.emit('call:initiate', { roomId: currentRoomId, callType });
  showToast('Call invited everyone in room');
}

function acceptCall(roomId, callerSocketId) {
  if (!roomId || !callerSocketId) {
    return;
  }
  showToast('Accepting call...');
  activeCallerSocketId = callerSocketId;
  socket.emit('call:accept', { roomId, targetSocketId: callerSocketId });
}

async function handleRemoteSignal(from, signal) {
  if (!peerConnection) {
    createPeerConnection(from);
  }

  if (signal.type === 'offer') {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('webrtc:signal', {
      targetSocketId: from,
      signal: peerConnection.localDescription,
    });
  }

  if (signal.type === 'answer') {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
  }

  if (signal.type === 'ice') {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } catch (error) {
      console.error('Error adding ICE candidate', error);
    }
  }
}

socket.on('room:joined', (data) => {
  if (data.messages) {
    clearMessages();
    data.messages.forEach(appendMessage);
  }
});

socket.on('presence:update', (payload) => {
  if (payload.roomId === currentRoomId) {
    renderPresence(payload.members);
  }
});

socket.on('typing:update', (payload) => {
  if (payload.roomId === currentRoomId) {
    renderTyping(payload);
  }
});

socket.on('message:created', (message) => {
  if (message.roomId === currentRoomId) {
    appendMessage(message);
  }
});

socket.on('call:incoming', async (payload) => {
  if (payload.roomId !== currentRoomId) {
    return;
  }

  const accept = window.confirm(`${payload.caller.username} is calling. Accept?`);
  if (!accept) {
    return;
  }

  await initLocalMedia();
  acceptCall(payload.roomId, payload.caller.socketId);
  showCallPanel();
});

socket.on('call:accepted', async ({ acceptedBy }) => {
  activeCallerSocketId = acceptedBy;
  await initLocalMedia();
  createPeerConnection(acceptedBy);

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('webrtc:signal', {
    targetSocketId: acceptedBy,
    signal: peerConnection.localDescription,
  });
  showCallPanel();
});

socket.on('webrtc:signal', async ({ from, signal }) => {
  if (!peerConnection) {
    createPeerConnection(from);
  }
  await handleRemoteSignal(from, signal);
});

socket.on('call:ended', () => {
  showToast('Call ended');
  hideCallPanel();
});

elements.sendButton.addEventListener('click', sendMessage);

elements.messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  } else {
    broadcastTyping();
  }
});

elements.createRoomButton.addEventListener('click', () => {
  elements.roomModal.classList.remove('hidden');
  elements.roomNameInput.value = '';
});

elements.cancelRoomButton.addEventListener('click', () => {
  elements.roomModal.classList.add('hidden');
});

elements.confirmRoomButton.addEventListener('click', async () => {
  const roomName = elements.roomNameInput.value.trim();
  if (!roomName) {
    showToast('Room name is required');
    return;
  }

  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: roomName }),
  });

  if (!response.ok) {
    showToast('Unable to create room');
    return;
  }

  const data = await response.json();
  elements.roomModal.classList.add('hidden');
  loadRooms();
  joinRoom(data.room.id, data.room.name);
});

elements.fileInput.addEventListener('change', async () => {
  const file = elements.fileInput.files[0];
  if (!file || !currentRoomId) {
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    showToast(payload.error || 'Upload failed');
    return;
  }

  socket.emit('message:create', {
    roomId: currentRoomId,
    messageType: 'file',
    attachmentUrl: payload.fileUrl,
    attachmentName: payload.fileName,
    attachmentType: payload.fileType,
  }, (result) => {
    if (!result.success) {
      showToast(result.message || 'File message failed');
    }
  });
});

elements.startVideoButton.addEventListener('click', () => initiateCall('video'));
elements.startAudioButton.addEventListener('click', () => initiateCall('audio'));
elements.endCallButton.addEventListener('click', () => {
  if (currentRoomId) {
    socket.emit('call:end', { roomId: currentRoomId });
  }
  hideCallPanel();
});

loadRooms();
