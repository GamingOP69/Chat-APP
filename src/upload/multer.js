const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const config = require('../../config/index');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

module.exports = upload;