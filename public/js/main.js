/* global io */

let socket = null;
const localId = localStorage.getItem('chatClientId') || `guest-${Math.random().toString(36).slice(2, 10)}`;
const username = localStorage.getItem('chatUsername') || `Guest-${Math.random().toString(36).slice(2, 6)}`;
localStorage.setItem('chatClientId', localId);
localStorage.setItem('chatUsername', username);

async function ensureAuthToken() {
  let token = localStorage.getItem('chatAuthToken');
  if (token) return token;

  try {
    const res = await fetch('/api/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    token = data.token;
    localStorage.setItem('chatAuthToken', token);
    return token;
  } catch (err) {
    console.error('Auth failed', err);
    return null;
  }
}

async function initSocket() {
  const token = await ensureAuthToken();
  socket = io({ auth: { token } });
}

async function startClient() {
  await initSocket();
  registerSocketHandlers();
  await fetchClientConfig();
  loadRooms();
}

startClient().catch((err) => console.error('Socket init error', err));

const elements = {
  sidebarToggle: document.getElementById('sidebar-toggle'),
  sidebarCloseButton: document.getElementById('sidebar-close-button'),
  sidebarBackdrop: document.getElementById('sidebar-backdrop'),
  roomList: document.getElementById('room-list'),
  currentRoomName: document.getElementById('current-room-name'),
  presenceText: document.getElementById('presence-text'),
  connectionStatus: document.getElementById('connection-status'),
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
  notificationToggleButton: document.getElementById('notification-toggle-button'),
  startVideoButton: document.getElementById('start-video-button'),
  startAudioButton: document.getElementById('start-audio-button'),
  callOverlay: document.getElementById('call-overlay'),
  endCallButton: document.getElementById('end-call-button'),
  localVideo: document.getElementById('local-video'),
  remoteVideo: document.getElementById('remote-video'),
};

let currentRoomId = null;
let typingTimeout = null;
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let unreadCount = 0;
let notificationsEnabled = localStorage.getItem('chatNotificationsEnabled') === 'true';
let audioContext = null;

let rtcIceServers = [{ urls: ['stun:stun.l.google.com:19302'] }];

async function fetchClientConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    const data = await res.json();
    if (data?.webRtc?.turnServers && data.webRtc.turnServers.length) {
      rtcIceServers = data.webRtc.turnServers.concat(data.webRtc.iceServers || []);
    } else if (data?.webRtc?.iceServers) {
      rtcIceServers = data.webRtc.iceServers;
    }
  } catch (err) {
    console.warn('Failed to fetch client config', err);
  }
}

fetchClientConfig();

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  window.setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 2800);
}

function updateNotificationButton() {
  if (!elements.notificationToggleButton) return;
  elements.notificationToggleButton.textContent = notificationsEnabled
    ? 'Notifications enabled'
    : 'Enable notifications';
}

function updateConnectionStatus(isConnected) {
  if (!elements.connectionStatus) return;
  elements.connectionStatus.textContent = isConnected ? 'Live' : 'Offline';
  elements.connectionStatus.classList.toggle('status-pill--muted', !isConnected);
}

function updateDocumentTitle() {
  document.title = unreadCount > 0
    ? `(${unreadCount}) Enterprise Chat Platform`
    : 'Enterprise Chat Platform';
}

function setSidebarOpen(isOpen) {
  if (!elements.sidebarBackdrop) return;
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('open', isOpen);
  elements.sidebarBackdrop.classList.toggle('hidden', !isOpen);
}

function ensureAudioContext() {
  if (audioContext) return audioContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
}

function playNotificationTone() {
  if (!notificationsEnabled) return;
  const context = ensureAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const gain = context.createGain();
  const oscillator = context.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(660, now);
  oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.22);
}

async function maybeShowBrowserNotification(message) {
  if (!notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  try {
    const notification = new Notification(message.username || 'New message', {
      body: message.content || message.attachmentName || 'New activity in your chat',
      tag: `chat-${message.roomId || 'global'}`,
      silent: true,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.warn('Notification unavailable', error);
  }
}

function handleIncomingActivity(message) {
  const isCurrentRoom = message.roomId === currentRoomId;
  const isOwnMessage = message.username === username;

  if (!isCurrentRoom || document.hidden) {
    unreadCount += 1;
    updateDocumentTitle();
    if (!isOwnMessage) {
      playNotificationTone();
      maybeShowBrowserNotification(message);
    }
  } else if (!isOwnMessage) {
    playNotificationTone();
  }
}

async function enableNotifications() {
  if (!('Notification' in window)) {
    showToast('Browser notifications are not supported here');
    return;
  }
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  notificationsEnabled = permission === 'granted';
  localStorage.setItem('chatNotificationsEnabled', String(notificationsEnabled));
  updateNotificationButton();
  showToast(notificationsEnabled ? 'Notifications enabled' : 'Notifications paused');
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
  card.dataset.messageId = message.id;
  card.classList.toggle('message-card--mine', message.username === username);

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

  const reactionsBar = document.createElement('div');
  reactionsBar.className = 'message-reactions';
  const reactButton = document.createElement('button');
  reactButton.className = 'btn btn-secondary';
  reactButton.textContent = '👍';
  reactButton.addEventListener('click', () => {
    if (!socket) return;
    socket.emit('message:react', { messageId: message.id, reaction: '👍' }, (res) => {
      if (!res || !res.success) return;
      renderReactions(card, res.reactions || []);
    });
  });
  reactionsBar.appendChild(reactButton);
  const reactionsList = document.createElement('div');
  reactionsList.className = 'reactions-list';
  reactionsBar.appendChild(reactionsList);
  card.appendChild(reactionsBar);
  elements.messageList.appendChild(card);
  elements.messageList.scrollTop = elements.messageList.scrollHeight;
}

function renderReactions(card, reactions) {
  const list = card.querySelector('.reactions-list');
  if (!list) return;
  list.innerHTML = '';
  const counts = {};
  reactions.forEach((r) => { counts[r.reaction] = (counts[r.reaction] || 0) + 1; });
  Object.keys(counts).forEach((k) => {
    const span = document.createElement('span');
    span.className = 'reaction-pill';
    span.textContent = `${k} ${counts[k]}`;
    list.appendChild(span);
  });
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
  unreadCount = 0;
  updateDocumentTitle();
  setRoomState(roomId, roomName);
  setSidebarOpen(false);
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
  peerConnection = new RTCPeerConnection({ iceServers: rtcIceServers });

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

function registerSocketHandlers() {
  if (!socket) return;

  socket.on('connect', () => {
    updateConnectionStatus(true);
  });

  socket.on('disconnect', () => {
    updateConnectionStatus(false);
  });

  socket.on('connect_error', () => {
    updateConnectionStatus(false);
  });

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
    handleIncomingActivity(message);
    if (message.roomId === currentRoomId) {
      appendMessage(message);
    }
  });

  socket.on('message:reaction', ({ messageId, reactions }) => {
    const card = document.querySelector(`article.message-card[data-message-id="${messageId}"]`);
    if (card) {
      renderReactions(card, reactions || []);
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
}

elements.sendButton.addEventListener('click', sendMessage);

if (elements.sidebarToggle) {
  elements.sidebarToggle.addEventListener('click', () => setSidebarOpen(true));
}

if (elements.sidebarCloseButton) {
  elements.sidebarCloseButton.addEventListener('click', () => setSidebarOpen(false));
}

if (elements.sidebarBackdrop) {
  elements.sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));
}

if (elements.notificationToggleButton) {
  elements.notificationToggleButton.addEventListener('click', enableNotifications);
}

updateNotificationButton();
if (elements.connectionStatus) {
  elements.connectionStatus.textContent = 'Connecting';
  elements.connectionStatus.classList.add('status-pill--muted');
}
updateDocumentTitle();

elements.messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    sendMessage();
  } else {
    broadcastTyping();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setSidebarOpen(false);
  }
});

window.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    unreadCount = 0;
    updateDocumentTitle();
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
  // Try presigned upload first
  try {
    const token = localStorage.getItem('chatAuthToken');
    const presignRes = await fetch('/api/upload/presign', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (presignRes.ok) {
      const { url, key, bucket } = await presignRes.json();
      const putRes = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!putRes.ok) throw new Error('S3 upload failed');

      const publicUrl = bucket && key && window.location.protocol.startsWith('http')
        ? `https://${bucket}.s3.${window.location.hostname.includes('amazon') ? '' : ''}${key}`
        : `s3://${key}`;

      socket.emit('message:create', {
        roomId: currentRoomId,
        messageType: 'file',
        attachmentUrl: publicUrl,
        attachmentName: file.name,
        attachmentType: file.type,
      }, (result) => {
        if (!result.success) {
          showToast(result.message || 'File message failed');
        }
      });
      return;
    }
  } catch (err) {
    console.warn('Presign upload not available or failed, falling back', err);
  }

  // Fallback to server upload
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
