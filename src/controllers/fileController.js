const path = require('path');

async function uploadFile(req, res, next) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const sanitizedFileName = path.basename(file.originalname);
    const fileUrl = `/uploads/${file.filename}`;

    // enqueue background job for post-upload processing (thumbnail, virus scan, metadata)
    try {
      const redis = require('../redis');
      const payload = JSON.stringify({
        fileUrl,
        fileName: sanitizedFileName,
        fileType: file.mimetype,
        size: file.size,
        uploadedAt: Date.now(),
        uploader: req.user?.id || null,
      });
      // push to 'queue:uploads'
      if (redis && redis.client) {
        redis.client.rPush('queue:uploads', payload).catch((e) => {
          // log but don't block response
          console.warn('Failed to enqueue upload job', e);
        });
      }
    } catch (err) {
      console.warn('Background job enqueue failed', err);
    }

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
