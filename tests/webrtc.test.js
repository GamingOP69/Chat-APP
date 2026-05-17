const assert = require('assert');
const { describe, it } = require('mocha');
const WebRTC = require('../src/webrtc/index');
const Socket = require('../src/socket');
const config = require('../config');

describe('WebRTC Signaling', () => {
  let socket, webrtc;

  beforeEach(() => {
    socket = new Socket();
    webrtc = new WebRTC();
  });

  afterEach(() => {
    socket.disconnect();
  });

  it('should create a new peer connection', async () => {
    const peerConnection = await webrtc.createPeerConnection();
    assert.ok(peerConnection);
  });

  it('should add stream to peer connection', async () => {
    const peerConnection = await webrtc.createPeerConnection();
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    await webrtc.addStream(peerConnection, stream);
    assert.ok(peerConnection.getLocalStreams().length > 0);
  });

  it('should handle ICE candidate', async () => {
    const peerConnection = await webrtc.createPeerConnection();
    const candidate = { candidate: 'candidate:1 1 udp 2130706431 192.168.1.100 1234 typ host' };
    await webrtc.handleIceCandidate(peerConnection, candidate);
    assert.ok(peerConnection.iceGatheringState === 'gathering');
  });

  it('should handle SDP offer', async () => {
    const peerConnection = await webrtc.createPeerConnection();
    const offer = await webrtc.createOffer(peerConnection);
    const response = await webrtc.handleSdpOffer(peerConnection, offer);
    assert.ok(response.type === 'answer');
  });

  it('should handle SDP answer', async () => {
    const peerConnection = await webrtc.createPeerConnection();
    const offer = await webrtc.createOffer(peerConnection);
    const answer = await webrtc.handleSdpOffer(peerConnection, offer);
    await webrtc.handleSdpAnswer(peerConnection, answer);
    assert.ok(peerConnection.iceState === 'connected');
  });

  it('should close peer connection', async () => {
    const peerConnection = await webrtc.createPeerConnection();
    await webrtc.closePeerConnection(peerConnection);
    assert.ok(peerConnection.signalingState === 'closed');
  });
});

describe('Voice Call', () => {
  let socket, webrtc, voice;

  beforeEach(() => {
    socket = new Socket();
    webrtc = new WebRTC();
    voice = require('../src/webrtc/voice');
  });

  afterEach(() => {
    socket.disconnect();
  });

  it('should initiate voice call', async () => {
    const call = await voice.initiateVoiceCall(socket, 'user123');
    assert.ok(call);
  });

  it('should handle voice call answer', async () => {
    const call = await voice.initiateVoiceCall(socket, 'user123');
    await voice.handleVoiceCallAnswer(socket, call.id);
    assert.ok(call.answered);
  });

  it('should handle voice call hangup', async () => {
    const call = await voice.initiateVoiceCall(socket, 'user123');
    await voice.handleVoiceCallHangup(socket, call.id);
    assert.ok(!call.active);
  });
});

describe('Video Call', () => {
  let socket, webrtc, video;

  beforeEach(() => {
    socket = new Socket();
    webrtc = new WebRTC();
    video = require('../src/webrtc/video');
  });

  afterEach(() => {
    socket.disconnect();
  });

  it('should initiate video call', async () => {
    const call = await video.initiateVideoCall(socket, 'user123');
    assert.ok(call);
  });

  it('should handle video call answer', async () => {
    const call = await video.initiateVideoCall(socket, 'user123');
    await video.handleVideoCallAnswer(socket, call.id);
    assert.ok(call.answered);
  });

  it('should handle video call hangup', async () => {
    const call = await video.initiateVideoCall(socket, 'user123');
    await video.handleVideoCallHangup(socket, call.id);
    assert.ok(!call.active);
  });
});