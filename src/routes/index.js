const express = require('express');
const { body, query, param } = require('express-validator');
const roomController = require('../controllers/roomController');
const fileController = require('../controllers/fileController');
const upload = require('../upload/multer');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/rooms', roomController.getRooms);
router.post(
  '/rooms',
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

router.post('/upload', upload.single('file'), fileController.uploadFile);

module.exports = router;
