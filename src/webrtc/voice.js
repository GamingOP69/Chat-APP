const { RTCPeerConnection, RTCSessionDescription } = require('wrtc');
const socket = require('../socket');
const _redis = require('../redis');
const config = require('../../config');

class VoiceCall {
  constructor(userId, roomId, socketId) {
    this.userId = userId;
    this.roomId = roomId;
    this.socketId = socketId;
    this.peerConnection = new RTCPeerConnection({
      iceServers: config.webrtc.iceServers,
    });
    this.mediaStream = null;
    this.remoteMediaStream = null;
    this.dataChannel = null;
  }

  async init() {
    try {
      await this.getUserMedia();
      await this.createOffer();
    } catch (error) {
      console.error('Error initializing voice call:', error);
    }
  }

  async getUserMedia() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      this.peerConnection.addStream(this.mediaStream);
    } catch (error) {
      console.error('Error getting user media:', error);
    }
  }

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp: offer }));
      socket.emit('voiceCallOffer', {
        userId: this.userId,
        roomId: this.roomId,
        socketId: this.socketId,
        sdp: offer,
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  async createAnswer(sdp) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));
      socket.emit('voiceCallAnswer', {
        userId: this.userId,
        roomId: this.roomId,
        socketId: this.socketId,
        sdp: answer,
      });
    } catch (error) {
      console.error('Error creating answer:', error);
    }
  }

  async addIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  async handleIceCandidate(event) {
    try {
      if (event.candidate) {
        socket.emit('voiceCallIceCandidate', {
          userId: this.userId,
          roomId: this.roomId,
          socketId: this.socketId,
          candidate: event.candidate,
        });
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  async handleRemoteStream(event) {
    try {
      this.remoteMediaStream = event.stream;
      // Play the remote stream
      const remoteAudio = document.createElement('audio');
      remoteAudio.srcObject = this.remoteMediaStream;
      remoteAudio.play();
    } catch (error) {
      console.error('Error handling remote stream:', error);
    }
  }

  async handleDataChannel(event) {
    try {
      this.dataChannel = event.channel;
      this.dataChannel.onmessage = (event) => {
        console.log('Received message:', event.data);
      };
      this.dataChannel.onopen = () => {
        console.log('Data channel open');
      };
      this.dataChannel.onclose = () => {
        console.log('Data channel closed');
      };
    } catch (error) {
      console.error('Error handling data channel:', error);
    }
  }
}

module.exports = VoiceCall;