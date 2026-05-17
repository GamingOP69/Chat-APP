const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { validateFile } = require('../utils/validation');
const { uploadDir } = require('../config/index');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    const isValid = validateFile(file);
    cb(null, isValid);
  },
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const fileName = req.file.filename;
  const fileType = req.file.mimetype;

  // Save file metadata to database
  // const fileMetadata = { filePath, fileName, fileType };
  // db.saveFileMetadata(fileMetadata);

  res.send({ message: 'File uploaded successfully', fileName });
});

router.get('/download/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(uploadDir, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ message: 'File not found' });
  }

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send({ message: 'Error downloading file' });
    }
  });
});

module.exports = router;