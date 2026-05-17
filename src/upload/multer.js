const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');

const uploadsPath = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsPath,
  filename(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    const fileName = `${uuidv4()}${extension}`;
    cb(null, fileName);
  },
});

function fileFilter(req, file, cb) {
  if (config.fileUpload.allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(new Error('Invalid file type'), false);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(config.fileUpload.maxFileSize) || 10 * 1024 * 1024,
  },
});
