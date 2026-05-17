const path = require('path');

async function uploadFile(req, res, next) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const sanitizedFileName = path.basename(file.originalname);
    const fileUrl = `/uploads/${file.filename}`;

    res.status(201).json({
      fileUrl,
      fileName: sanitizedFileName,
      fileType: file.mimetype,
      size: file.size,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadFile };
