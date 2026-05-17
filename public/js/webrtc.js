// WebRTC client setup and peer connection handling

let pc = null;
let localStream = null;
let remoteStream = null;
let iceCandidates = [];

// Get user media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    document.getElementById('local-video').srcObject = stream;
  })
  .catch(error => {
    console.error('Error getting user media:', error);
  });

// Create peer connection
pc = new RTCPeerConnection({
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302']
    }
  ]
});

// Add local stream to peer connection
pc.addStream(localStream);

// Handle ice candidate
pc.onicecandidate = event => {
  if (event.candidate) {
    iceCandidates.push(event.candidate);
    socket.emit('webrtc/ice', event.candidate);
  }
};

// Handle track
pc.ontrack = event => {
  remoteStream = event.streams[0];
  document.getElementById('remote-video').srcObject = remoteStream;
};

// Handle connection state change
pc.onconnectionstatechange = () => {
  if (pc.connectionState === 'connected') {
    console.log('Peer connection established');
  } else if (pc.connectionState === 'disconnected') {
    console.log('Peer connection disconnected');
  }
};

// Handle signaling
socket.on('webrtc/sdp', (sdp, from) => {
  if (sdp.type === 'offer') {
    pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
    pc.createAnswer()
      .then(answer => {
        return pc.setLocalDescription(new RTCSessionDescription({ type: 'answer', sdp }));
      })
      .then(() => {
        socket.emit('webrtc/sdp', pc.localDescription, from);
      });
  } else if (sdp.type === 'answer') {
    pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
  }
});

socket.on('webrtc/ice', (candidate, from) => {
  pc.addIceCandidate(new RTCIceCandidate(candidate));
});

// Create offer
document.getElementById('create-offer').addEventListener('click', () => {
  pc.createOffer()
    .then(offer => {
      return pc.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp: offer }));
    })
    .then(() => {
      socket.emit('webrtc/sdp', pc.localDescription);
    });
});

// Create answer
document.getElementById('create-answer').addEventListener('click', () => {
  pc.createAnswer()
    .then(answer => {
      return pc.setLocalDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));
    })
    .then(() => {
      socket.emit('webrtc/sdp', pc.localDescription);
    });
});

// Hang up
document.getElementById('hang-up').addEventListener('click', () => {
  pc.close();
  pc = null;
  localStream = null;
  remoteStream = null;
  iceCandidates = [];
});

// Mute
document.getElementById('mute').addEventListener('click', () => {
  localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
});

// Unmute
document.getElementById('unmute').addEventListener('click', () => {
  localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
});

// Switch camera
document.getElementById('switch-camera').addEventListener('click', () => {
  localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
});

// Screen sharing
document.getElementById('screen-sharing').addEventListener('click', () => {
  navigator.mediaDevices.getDisplayMedia({ video: true })
    .then(stream => {
      pc.addStream(stream);
    })
    .catch(error => {
      console.error('Error sharing screen:', error);
    });
});