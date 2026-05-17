// src/webrtc/video.js

const { RTCPeerConnection, RTCSessionDescription } = require('wrtc');
const socket = require('../socket');
const config = require('../../config/index');
const logger = require('../../utils/logger');

class VideoCall {
  constructor(userId, roomId, socketId) {
    this.userId = userId;
    this.roomId = roomId;
    this.socketId = socketId;
    this.peerConnection = new RTCPeerConnection({
      iceServers: config.webrtc.iceServers,
    });
    this.localStream = null;
    this.remoteStream = null;
    this.dataChannel = null;
  }

  async init() {
    try {
      await this.getUserMedia();
      await this.createPeerConnection();
      await this.createDataChannel();
      await this.addStream();
      await this.createOffer();
    } catch (error) {
      logger.error('Error initializing video call:', error);
    }
  }

  async getUserMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      this.localStream = stream;
    } catch (error) {
      logger.error('Error getting user media:', error);
    }
  }

  async createPeerConnection() {
    try {
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc:iceCandidate', {
            userId: this.userId,
            roomId: this.roomId,
            socketId: this.socketId,
            candidate: event.candidate,
          });
        }
      };

      this.peerConnection.onaddstream = (event) => {
        this.remoteStream = event.stream;
      };

      this.peerConnection.onremovestream = () => {
        this.remoteStream = null;
      };
    } catch (error) {
      logger.error('Error creating peer connection:', error);
    }
  }

  async createDataChannel() {
    try {
      this.dataChannel = this.peerConnection.createDataChannel('videoCall');
      this.dataChannel.onopen = () => {
        logger.info('Data channel opened');
      };

      this.dataChannel.onclose = () => {
        logger.info('Data channel closed');
      };

      this.dataChannel.onerror = (error) => {
        logger.error('Error on data channel:', error);
      };

      this.dataChannel.onmessage = (event) => {
        logger.info('Received message on data channel:', event.data);
      };
    } catch (error) {
      logger.error('Error creating data channel:', error);
    }
  }

  async addStream() {
    try {
      this.peerConnection.addStream(this.localStream);
    } catch (error) {
      logger.error('Error adding stream to peer connection:', error);
    }
  }

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp: offer }));
      socket.emit('webrtc:offer', {
        userId: this.userId,
        roomId: this.roomId,
        socketId: this.socketId,
        offer: offer,
      });
    } catch (error) {
      logger.error('Error creating offer:', error);
    }
  }

  async createAnswer(offer) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offer }));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));
      socket.emit('webrtc:answer', {
        userId: this.userId,
        roomId: this.roomId,
        socketId: this.socketId,
        answer: answer,
      });
    } catch (error) {
      logger.error('Error creating answer:', error);
    }
  }

  async addIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      logger.error('Error adding ice candidate:', error);
    }
  }
}

module.exports = VideoCall;