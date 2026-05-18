const logger = require('../utils/logger');
let admin = null;
try {
  const firebaseAdmin = require('firebase-admin');
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) : null;
  if (serviceAccount) {
    firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(serviceAccount) });
    admin = firebaseAdmin;
    logger.info('Firebase admin initialized');
  } else {
    logger.info('Firebase admin not configured (no service account)');
  }
} catch (err) {
  logger.warn('firebase-admin not installed or failed to init: %o', err);
}

async function sendPushNotification(token, payload) {
  if (!admin) {
    logger.warn('FCM not initialized; skipping push');
    return null;
  }

  try {
    const message = await admin.messaging().sendToDevice(token, { notification: payload });
    return message;
  } catch (err) {
    logger.error('FCM send error: %o', err);
    throw err;
  }
}

module.exports = { sendPushNotification };
