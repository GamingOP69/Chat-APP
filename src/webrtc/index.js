const { RTCPeerConnection, RTCSessionDescription } = require('wrtc');
const socket = require('../socket');
const config = require('../../config');
const logger = require('../../utils/logger');

class WebRTC {
  constructor() {
    this.peerConnections = {};
    this.localStreams = {};
    this.remoteStreams = {};
  }

  async createPeerConnection(roomId, userId) {
    const peerConnection = new RTCPeerConnection({
      iceServers: config.webrtc.iceServers,
    });

    peerConnection.onicecandidate = (_event) => {
      if (_event.candidate) {
        socket.emit('webrtc:candidate', {
          roomId,
          userId,
          candidate: _event.candidate,
        });
      }
    };

    peerConnection.onaddstream = (_event) => {
      this.remoteStreams[roomId] = _event.stream;
      socket.emit('webrtc:stream', {
        roomId,
        userId,
        stream: _event.stream,
      });
    };

    peerConnection.onremovestream = (_event) => {
      delete this.remoteStreams[roomId];
      socket.emit('webrtc:stream:remove', {
        roomId,
        userId,
      });
    };

    peerConnection.onnegotiationneeded = () => {
      peerConnection.createOffer().then((offer) => {
        return peerConnection.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp: offer }));
      }).then(() => {
        socket.emit('webrtc:offer', {
          roomId,
          userId,
          offer: peerConnection.localDescription,
        });
      }).catch((error) => {
        logger.error('Error creating offer:', error);
      });
    };

    this.peerConnections[roomId] = peerConnection;
    return peerConnection;
  }

  async createOffer(roomId, userId) {
    const peerConnection = await this.createPeerConnection(roomId, userId);
    return peerConnection.localDescription;
  }

  async createAnswer(roomId, userId, offer) {
    const peerConnection = await this.createPeerConnection(roomId, userId);
    await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offer }));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));
    return peerConnection.localDescription;
  }

  async addIceCandidate(roomId, candidate) {
    const peerConnection = this.peerConnections[roomId];
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  async addStream(roomId, stream) {
    const peerConnection = this.peerConnections[roomId];
    if (peerConnection) {
      peerConnection.addStream(stream);
    }
  }

  async removeStream(roomId, stream) {
    const peerConnection = this.peerConnections[roomId];
    if (peerConnection) {
      peerConnection.removeStream(stream);
    }
  }

  async closePeerConnection(roomId) {
    const peerConnection = this.peerConnections[roomId];
    if (peerConnection) {
      peerConnection.close();
      delete this.peerConnections[roomId];
    }
  }
}

module.exports = WebRTC;