import { io } from 'socket.io-client';
import { config } from '../config/index.js';

const socket = io(config.socketUrl, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomization: 100,
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('Socket connected');
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

socket.on('reconnect', (attempt) => {
  console.log(`Socket reconnect attempt ${attempt}`);
});

socket.on('reconnect_error', (error) => {
  console.error('Socket reconnect error:', error);
});

socket.on('message', (message) => {
  console.log('Received message:', message);
  // Handle incoming message
});

socket.on('typing', (typing) => {
  console.log('Received typing indicator:', typing);
  // Handle typing indicator
});

socket.on('presence', (presence) => {
  console.log('Received presence update:', presence);
  // Handle presence update
});

socket.on('call', (call) => {
  console.log('Received call:', call);
  // Handle incoming call
});

socket.on('iceCandidate', (candidate) => {
  console.log('Received ICE candidate:', candidate);
  // Handle ICE candidate
});

socket.on('sdpOffer', (offer) => {
  console.log('Received SDP offer:', offer);
  // Handle SDP offer
});

socket.on('sdpAnswer', (answer) => {
  console.log('Received SDP answer:', answer);
  // Handle SDP answer
});

socket.on('hangup', () => {
  console.log('Received hangup signal');
  // Handle hangup
});

export default socket;