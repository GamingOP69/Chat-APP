const express = require('express');
const { body, query, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const roomController = require('../controllers/roomController');
const fileController = require('../controllers/fileController');
const upload = require('../upload/multer');
const validateRequest = require('../middleware/validateRequest');
const { authenticateHttp } = require('../middleware/authenticate');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const authController = require('../controllers/authController');
const googleAuthController = require('../controllers/googleAuthController');
const configController = require('../controllers/configController');
const uploadController = require('../controllers/uploadController');
const deviceController = require('../controllers/deviceController');
const friendController = require('../controllers/friendController');
const reactionController = require('../controllers/reactionController');

router.post('/auth/guest', authController.createGuestToken);
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', authController.logout);
router.post('/auth/google', googleAuthController.verifyGoogleToken);
router.get('/config', configController.getClientConfig);
router.post('/upload/presign', authenticateHttp, uploadController.getPresignUrl);
router.post('/devices', authenticateHttp, deviceController.registerDevice);
router.post('/friends/request', authenticateHttp, friendController.sendRequest);
router.post('/friends/accept', authenticateHttp, friendController.acceptRequest);
router.get('/friends', authenticateHttp, friendController.listFriends);
router.post('/messages/react', authenticateHttp, reactionController.addReaction);
router.post('/messages/react/remove', authenticateHttp, reactionController.removeReaction);

router.get('/rooms', roomController.getRooms);
router.post(
  '/rooms',
  authenticateHttp,
  body('name').trim().isLength({ min: 1 }).withMessage('Room name is required'),
  validateRequest,
  roomController.createRoom,
);
router.get(
  '/rooms/:roomId/messages',
  param('roomId').isInt().withMessage('Room ID must be a number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('beforeId').optional().isInt().toInt(),
  validateRequest,
  roomController.getRoomMessages,
);

const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 6, standardHeaders: true, legacyHeaders: false });
router.post('/upload', authenticateHttp, uploadLimiter, upload.single('file'), fileController.uploadFile);

module.exports = router;
