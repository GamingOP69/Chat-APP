const config = require('../../config');

function getClientConfig(req, res) {
  // Expose only safe fields needed by the client
  const cfg = {
    webRtc: {
      iceServers: config.webRtc.iceServers,
      turnServers: config.webRtc.turnServers,
    },
    socket: {
      corsOrigin: config.socketIo.cors.origin,
    },
  };

  res.json(cfg);
}

module.exports = { getClientConfig };
